/**
 * ── Freesound.org Bulk Import ─────────────────────────────────────────────────
 *
 * Searches Freesound.org, downloads HQ MP3 previews, uploads to R2, and
 * inserts documents into MongoDB — ready to play on SoundEffectPro.
 *
 * Usage:
 *   node scripts/importFreesound.mjs \
 *     --query "vine boom"       # Freesound search query (required)
 *     --category Meme           # Our category (default: Random)
 *     --count 50                # Max sounds to import (default: 50)
 *     --tags "meme,viral"       # Extra tags, comma-separated
 *     --license cc0             # Filter: cc0 | by | sa | all  (default: cc0,by)
 *     --min-duration 0.5        # Seconds (default: 0.5)
 *     --max-duration 120        # Seconds (default: 120)
 *     --dry-run                 # Preview only, no writes
 *
 * Required env vars (loaded from .env):
 *   FREESOUND_API_KEY   — get free at https://freesound.org/apiv2/apply/
 *   MONGO_URI
 *   R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY, R2_SECRET_KEY
 *   NEXT_PUBLIC_R2_PUBLIC_URL
 *
 * License mapping:
 *   CC0  → public-domain   (safe for all commercial use)
 *   CC-BY → royalty-free   (commercial OK with attribution — we link to Freesound)
 *   CC-BY-SA → creative-commons
 *   CC-BY-NC*, CC-BY-ND* → skipped (non-commercial or no-derivatives)
 */

import { readFileSync } from 'fs';
import { resolve }      from 'path';
import { MongoClient }  from 'mongodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// ── Load .env ──────────────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env');
try {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const eq = t.indexOf('=');
        if (eq === -1) continue;
        const k = t.slice(0, eq).trim();
        const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[k]) process.env[k] = v;
    }
} catch { console.error('Could not read .env'); process.exit(1); }

// ── Parse CLI args ─────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
function arg(flag, def = null) {
    const i = argv.indexOf(flag);
    return i !== -1 && argv[i + 1] ? argv[i + 1] : def;
}

const QUERY       = arg('--query') ?? arg('-q');
const CATEGORY    = arg('--category') ?? arg('-c') ?? 'Random';
const COUNT       = parseInt(arg('--count') ?? arg('-n') ?? '50', 10);
const EXTRA_TAGS  = (arg('--tags') ?? '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
const LICENSE_ARG = (arg('--license') ?? 'cc0,by').toLowerCase();
const MIN_DUR     = parseFloat(arg('--min-duration') ?? '0.5');
const MAX_DUR     = parseFloat(arg('--max-duration') ?? '120');
const DRY_RUN     = argv.includes('--dry-run');

if (!QUERY) {
    console.error('Error: --query is required\n');
    console.error('Example: node scripts/importFreesound.mjs --query "vine boom" --category Meme --count 20');
    process.exit(1);
}

// ── Validate env ───────────────────────────────────────────────────────────────
const FREESOUND_KEY  = process.env.FREESOUND_API_KEY;
const MONGO_URI      = process.env.MONGO_URI;
const R2_ENDPOINT    = process.env.R2_ENDPOINT;
const R2_BUCKET      = process.env.R2_BUCKET;
const R2_ACCESS_KEY  = process.env.R2_ACCESS_KEY;
const R2_SECRET_KEY  = process.env.R2_SECRET_KEY;
const R2_PUBLIC_URL  = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/$/, '');

const missing = [
    !FREESOUND_KEY && 'FREESOUND_API_KEY',
    !MONGO_URI     && 'MONGO_URI',
    !R2_ENDPOINT   && 'R2_ENDPOINT',
    !R2_BUCKET     && 'R2_BUCKET',
    !R2_ACCESS_KEY && 'R2_ACCESS_KEY',
    !R2_SECRET_KEY && 'R2_SECRET_KEY',
].filter(Boolean);

if (missing.length) {
    console.error('Missing env vars:', missing.join(', '));
    process.exit(1);
}

// ── License filter ─────────────────────────────────────────────────────────────
// Maps Freesound license URL → our license value (or null to skip)
const LICENSE_MAP = {
    'https://creativecommons.org/publicdomain/zero/1.0/':  'public-domain',
    'http://creativecommons.org/publicdomain/zero/1.0/':   'public-domain',
    'https://creativecommons.org/licenses/by/4.0/':        'royalty-free',
    'https://creativecommons.org/licenses/by/3.0/':        'royalty-free',
    'http://creativecommons.org/licenses/by/4.0/':         'royalty-free',
    'http://creativecommons.org/licenses/by/3.0/':         'royalty-free',
    'https://creativecommons.org/licenses/by-sa/4.0/':     'creative-commons',
    'https://creativecommons.org/licenses/by-sa/3.0/':     'creative-commons',
    'http://creativecommons.org/licenses/by-sa/4.0/':      'creative-commons',
    'http://creativecommons.org/licenses/by-sa/3.0/':      'creative-commons',
    // Non-commercial / no-derivatives → skip
    'https://creativecommons.org/licenses/by-nc/4.0/':     null,
    'https://creativecommons.org/licenses/by-nc/3.0/':     null,
    'http://creativecommons.org/licenses/by-nc/3.0/':      null,
    'https://creativecommons.org/licenses/by-nc-sa/4.0/':  null,
    'https://creativecommons.org/licenses/by-nc-sa/3.0/':  null,
    'http://createivecommons.org/licenses/by-nc-sa/3.0/':  null,
    'https://creativecommons.org/licenses/by-nd/4.0/':     null,
    'https://creativecommons.org/licenses/by-nc-nd/4.0/':  null,
};

// ── Title content filter ───────────────────────────────────────────────────────
const BLOCKED_TITLE_WORDS = [
    'fuck', 'shit', 'bitch', 'cunt', 'nigger', 'nigga', 'faggot', 'pussy',
    'asshole', 'bastard', 'motherfucker', 'cock', 'dick', 'whore', 'slut',
    'porn', 'sex', 'rape', 'kill yourself', 'kys',
];

function isTitleClean(title) {
    const lower = title.toLowerCase();
    return !BLOCKED_TITLE_WORDS.some(w => lower.includes(w));
}

// License filter based on --license flag
function wantLicense(licenseUrl) {
    const mapped = LICENSE_MAP[licenseUrl] ?? null;
    if (!mapped) return false;
    if (LICENSE_ARG === 'all') return true;
    const flags = LICENSE_ARG.split(',').map(s => s.trim());
    if (flags.includes('cc0')   && mapped === 'public-domain')   return true;
    if (flags.includes('by')    && mapped === 'royalty-free')    return true;
    if (flags.includes('sa')    && mapped === 'creative-commons') return true;
    return false;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function secToMMSS(seconds) {
    const totalSec = Math.round(seconds);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function slugify(str) {
    return str.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80);
}

function randomBtnColor() {
    const colors = ['0','20','125','145','195','225','255','280','305','335'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function cleanTitle(name) {
    // Remove file extensions and clean up
    return name
        .replace(/\.(wav|mp3|ogg|flac|aiff?|m4a)$/i, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100);
}

function extractTags(freesoundTags, extraTags) {
    const combined = [...freesoundTags, ...extraTags]
        .map(t => t.toLowerCase().trim().replace(/[^a-z0-9-]/g, '').slice(0, 15))
        .filter(t => t.length > 0 && t.length <= 15);
    // Deduplicate and cap at 10
    return [...new Set(combined)].slice(0, 10);
}

// ── Freesound API ──────────────────────────────────────────────────────────────
const FS_BASE = 'https://freesound.org/apiv2';

async function freesoundSearch(query, page = 1, pageSize = 150) {
    const params = new URLSearchParams({
        query,
        token:     FREESOUND_KEY,
        fields:    'id,name,tags,description,duration,license,username,previews',
        page:      String(page),
        page_size: String(Math.min(pageSize, 150)),
        filter:    `duration:[${MIN_DUR} TO ${MAX_DUR}]`,
        format:    'json',
    });
    const url = `${FS_BASE}/search/text/?${params}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Freesound search failed: ${res.status} ${res.statusText}`);
    return res.json();
}

async function downloadPreview(url) {
    // Add token to URL if needed
    const fullUrl = url.includes('?') ? `${url}&token=${FREESOUND_KEY}` : `${url}?token=${FREESOUND_KEY}`;
    const res = await fetch(fullUrl);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
}

// ── R2 client ──────────────────────────────────────────────────────────────────
const r2 = new S3Client({
    region:   'auto',
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
});

async function uploadToR2(buffer, s_id) {
    await r2.send(new PutObjectCommand({
        Bucket:       R2_BUCKET,
        Key:          `store/${s_id}.mp3`,
        Body:         buffer,
        ContentType:  'audio/mpeg',
        CacheControl: 'public, max-age=31536000, immutable',
    }));
}

// ── Main ───────────────────────────────────────────────────────────────────────
const client = new MongoClient(MONGO_URI);
let db, files;

async function uniqueSlug(base) {
    let slug = base, n = 0;
    while (await files.findOne({ slug })) slug = `${base}-${++n}`;
    return slug;
}

async function main() {
    console.log(`\n🎵 Freesound Import`);
    console.log(`   Query:    "${QUERY}"`);
    console.log(`   Category: ${CATEGORY}`);
    console.log(`   Count:    ${COUNT}`);
    console.log(`   License:  ${LICENSE_ARG}`);
    console.log(`   Duration: ${MIN_DUR}s – ${MAX_DUR}s`);
    console.log(`   Dry run:  ${DRY_RUN ? 'YES (no writes)' : 'NO (writing to DB)'}\n`);

    if (!DRY_RUN) {
        await client.connect();
        db    = client.db();
        files = db.collection('files');
        console.log('✅ Connected to MongoDB\n');
    }

    let imported = 0, skipped = 0, failed = 0, page = 1;
    const seenIds = new Set(); // Freesound IDs we've already processed this run

    outer: while (imported < COUNT) {
        console.log(`📄 Fetching page ${page}…`);
        let data;
        try {
            data = await freesoundSearch(QUERY, page, 150);
        } catch (err) {
            console.error(`  ✗ Search failed: ${err.message}`);
            break;
        }

        if (!data.results?.length) {
            console.log('  No more results.');
            break;
        }

        console.log(`  Found ${data.results.length} results on page ${page} (total ~${data.count})\n`);

        for (const sound of data.results) {
            if (imported >= COUNT) break outer;
            if (seenIds.has(sound.id)) continue;
            seenIds.add(sound.id);

            const sourceUrl = `https://freesound.org/s/${sound.id}/`;

            // ── Skip checks ──────────────────────────────────────────────────
            if (!wantLicense(sound.license)) {
                console.log(`  ⏭  [${sound.id}] ${sound.name.slice(0, 50)} — license skipped (${sound.license})`);
                skipped++;
                continue;
            }

            const titleRaw = cleanTitle(sound.name);
            if (!isTitleClean(titleRaw)) {
                console.log(`  ⏭  [${sound.id}] ${titleRaw.slice(0, 50)} — title blocked`);
                skipped++;
                continue;
            }

            if (!sound.previews?.['preview-hq-mp3']) {
                console.log(`  ⏭  [${sound.id}] ${sound.name.slice(0, 50)} — no HQ preview`);
                skipped++;
                continue;
            }

            if (!DRY_RUN) {
                const exists = await files.findOne({ sourceUrl });
                if (exists) {
                    console.log(`  ⏭  [${sound.id}] ${sound.name.slice(0, 50)} — already imported`);
                    skipped++;
                    continue;
                }
            }

            // ── Prepare document fields ──────────────────────────────────────
            const title    = cleanTitle(sound.name);
            if (title.length < 3) { skipped++; continue; }

            const duration = secToMMSS(sound.duration);
            const license  = LICENSE_MAP[sound.license];
            const tags     = extractTags(sound.tags ?? [], EXTRA_TAGS);
            const slugBase = slugify(title);

            console.log(`  → [${sound.id}] "${title}" (${duration}) [${license}]`);

            if (DRY_RUN) {
                imported++;
                continue;
            }

            // ── Download + upload ────────────────────────────────────────────
            const s_id = uuidv4().replace(/-/g, '');
            const slug = await uniqueSlug(slugBase);

            let buffer;
            try {
                buffer = await downloadPreview(sound.previews['preview-hq-mp3']);
                await sleep(300); // polite delay between downloads
            } catch (err) {
                console.error(`     ✗ Download failed: ${err.message}`);
                failed++;
                continue;
            }

            try {
                await uploadToR2(buffer, s_id);
            } catch (err) {
                console.error(`     ✗ R2 upload failed: ${err.message}`);
                failed++;
                continue;
            }

            // ── Insert into MongoDB ──────────────────────────────────────────
            const now    = new Date();
            const weekMs = 7  * 24 * 3600 * 1000;
            const monMs  = 30 * 24 * 3600 * 1000;
            const hyMs   = 182 * 24 * 3600 * 1000;

            await files.insertOne({
                s_id,
                slug,
                title,
                duration,
                tags,
                category:         CATEGORY,
                description:      `Imported from Freesound.org — original by ${sound.username}. Source: ${sourceUrl}`,
                sourceUrl,
                btnColor:         randomBtnColor(),
                user:             { uid: 'system', name: 'Freesound' },
                license,
                trendScore:       0,
                visibility:       true,
                moderationStatus: 'approved',
                stats: {
                    views: 0, likes: 0, downloads: 0, reports: 0,
                    weekly:     { views: 0, likes: 0, downloads: 0, periodStart: new Date(now - weekMs) },
                    monthly:    { views: 0, likes: 0, downloads: 0, periodStart: new Date(now - monMs) },
                    halfYearly: { views: 0, likes: 0, downloads: 0, periodStart: new Date(now - hyMs) },
                },
                createdAt: now,
                updatedAt: now,
            });

            console.log(`     ✓ Saved  s_id=${s_id}  slug=${slug}`);
            imported++;

            await sleep(600); // ~1.5 req/sec total — stays under Freesound rate limit
        }

        // No next page
        if (!data.next) {
            console.log('\n  No more pages.');
            break;
        }

        page++;
        await sleep(1000); // 1s between page fetches
    }

    if (!DRY_RUN) await client.close();

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log('\n─────────────────────────────────────────');
    console.log(`✅ Imported: ${imported}`);
    console.log(`⏭  Skipped:  ${skipped}`);
    console.log(`✗  Failed:   ${failed}`);
    if (DRY_RUN) console.log('\n(Dry run — nothing was written)');
    console.log('─────────────────────────────────────────\n');
}

main().catch(err => {
    console.error('\nFatal error:', err.message);
    process.exit(1);
});
