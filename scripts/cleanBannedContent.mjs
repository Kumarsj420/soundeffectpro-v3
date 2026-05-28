/**
 * ── DB Cleanup: Hide files containing banned words ───────────────────────────
 *
 * Finds all documents in the `files` collection where title, tags, or
 * description contain a slur or hate-speech term, then sets:
 *   visibility:        false
 *   moderationStatus:  'rejected'
 *
 * Usage:
 *   node scripts/cleanBannedContent.mjs           ← dry run (shows what would change)
 *   node scripts/cleanBannedContent.mjs --apply   ← actually updates the DB
 *
 * Safe to run multiple times — already-hidden docs are excluded from results.
 */

import { readFileSync } from 'fs';
import { MongoClient } from 'mongodb';
import { resolve } from 'path';

// ── Load .env manually (no dotenv dependency needed) ─────────────────────────
const envPath = resolve(process.cwd(), '.env');
try {
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
    }
} catch {
    console.error('Could not read .env file — make sure you run this from the project root.');
    process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error('MONGO_URI is not set in .env');
    process.exit(1);
}

const DRY_RUN = !process.argv.includes('--apply');

// ── Banned words (mirrors app/lib/bannedWords.ts) ────────────────────────────
// Kept as plain JS here so the script has zero TS dependencies.
const BANNED_WORDS = [
    // Racial slurs
    'nigger', 'nigga', 'nigg',
    'chink', 'gook', 'spic', 'spick', 'beaner',
    'kike', 'hymie', 'wetback', 'raghead', 'towelhead',
    'coon', 'jigaboo', 'sambo', 'zipperhead', 'slope',
    // Homophobic / transphobic
    'faggot', 'faggots', 'dyke', 'tranny', 'shemale',
    // Hate phrases
    'heil hitler', 'white power', 'white supremacy',
    'gas the jews', 'kill all', 'death to',
    // Sexual violence
    'child porn', 'childporn',
    'rape', 'molest', 'pedophile',
];

// Leet-speak normaliser
const LEET = { '0':'o','1':'i','3':'e','4':'a','5':'s','6':'g','7':'t','8':'b','@':'a','$':'s','!':'i','+':'t' };

function normalize(text) {
    return String(text ?? '')
        .toLowerCase()
        .split('')
        .map(c => LEET[c] ?? c)
        .join('')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function wordBoundaryMatch(normalized, word) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i').test(normalized);
}

function hasBannedWord(text) {
    if (!text) return false;
    const n = normalize(text);
    return BANNED_WORDS.some(w =>
        w.includes(' ') ? n.includes(w) : wordBoundaryMatch(n, w)
    );
}

function whichBannedWord(text) {
    if (!text) return null;
    const n = normalize(text);
    return BANNED_WORDS.find(w =>
        w.includes(' ') ? n.includes(w) : wordBoundaryMatch(n, w)
    ) ?? null;
}

function checkDoc(doc) {
    const titleHit  = whichBannedWord(doc.title);
    const descHit   = whichBannedWord(doc.description);
    const tagsHit   = (doc.tags ?? []).find(t => hasBannedWord(t)) ?
                      whichBannedWord((doc.tags ?? []).join(' ')) : null;
    return titleHit || descHit || tagsHit || null;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n🔍  SoundEffectPro — Banned Content Cleanup');
    console.log(`    Mode: ${DRY_RUN ? '🟡 DRY RUN (no changes will be made)' : '🔴 APPLY (will update the DB)'}`);
    console.log('─'.repeat(60));

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db     = client.db('soundfx');
    const col    = db.collection('files');

    // Fetch all visible files (hidden ones are already dealt with)
    const cursor = col.find(
        { visibility: true },
        { projection: { _id: 1, s_id: 1, title: 1, description: 1, tags: 1, moderationStatus: 1 } }
    );

    const toHide = [];

    for await (const doc of cursor) {
        const hit = checkDoc(doc);
        if (hit) {
            toHide.push({ _id: doc._id, s_id: doc.s_id, title: doc.title, matched: hit });
        }
    }

    console.log(`\n📋  Found ${toHide.length} visible file(s) with banned content:\n`);

    if (toHide.length === 0) {
        console.log('   ✅  Database is clean — nothing to hide.\n');
        await client.close();
        return;
    }

    // Print every affected document
    for (const doc of toHide) {
        console.log(`   • [${doc.s_id}] "${doc.title}"`);
        console.log(`     Matched: "${doc.matched}"`);
    }

    console.log('');

    if (DRY_RUN) {
        console.log('🟡  DRY RUN — no changes made.');
        console.log('    Run with --apply to hide these files:\n');
        console.log(`    node scripts/cleanBannedContent.mjs --apply\n`);
    } else {
        const ids   = toHide.map(d => d._id);
        const result = await col.updateMany(
            { _id: { $in: ids } },
            { $set: { visibility: false, moderationStatus: 'rejected' } }
        );
        console.log(`✅  Updated ${result.modifiedCount} document(s):`);
        console.log('    visibility → false');
        console.log('    moderationStatus → "rejected"\n');
    }

    await client.close();
}

main().catch(err => {
    console.error('\n❌  Script failed:', err.message);
    process.exit(1);
});
