/**
 * ── DB Migration: Seed `license` field on all File documents ─────────────────
 *
 * Categories auto-tagged as 'copyrighted':
 *   - Standard: Meme, Gaming, Anime, Movies, Series, Comedy, Politics
 *   - Specific franchises found in DB: Valorant, Minecraft, Fortnite, etc.
 *   - Celebrity / character categories
 *
 * Everything else (null category, ambiguous SFX, animals, etc.) → 'unknown'
 * so they surface in admin for manual review.
 *
 * Already-tagged documents are skipped (idempotent — safe to re-run).
 *
 * Usage:
 *   node scripts/migrateLicense.mjs           ← dry run, shows counts
 *   node scripts/migrateLicense.mjs --apply   ← writes to DB
 */

import { readFileSync } from 'fs';
import { MongoClient } from 'mongodb';
import { resolve } from 'path';

// ── Load .env ─────────────────────────────────────────────────────────────────
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

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1); }

const DRY_RUN = !process.argv.includes('--apply');

// ── Copyrighted: clear IP ownership — clips from games, films, TV, celebrities
const COPYRIGHTED_CATEGORIES = [
    // Standard app categories
    'Meme', 'Gaming', 'Anime', 'Movies', 'Series', 'Comedy', 'Politics',
    // Games (copyrighted by their publishers)
    'Valorant', 'Minecraft', 'Fortnite', 'Among Us', 'Roblox', 'Rust',
    'CSGO', 'Overwatch', 'Rainbow Six', 'Clash Royale', 'Clash Of Clans',
    'League Of Legends', 'Mario Luigi', 'Super Mario', 'PacMan', 'Mario Kart',
    'Video Games', 'Ninja Fortnite', 'Wasteland 3',
    // Movies / TV / animation
    'SpongeBob', 'The Simpsons', 'Star Wars', 'South Park', 'Mandalorian',
    'Friday The 13th', 'Stranger Things', 'Squid Game', 'Death Note',
    'One Piece', 'Cartoon Background', 'Huggy Wuggy', 'Pingu Noot Noot',
    'FANF', 'Anya Spy X Family', 'R2D2 Star Wars', 'Kamehameha',
    'Chewbacca', 'Zenyatta', 'Godzilla Roar',
    // Celebrities / characters
    'Duke Nukem', 'Jack Black', 'Arnold Schwarzenegger', 'Vin Diesel',
    'Mr. Beast', 'Borat', 'Herbert The Pervert', 'Talking Ben',
    'Tim Westwood', 'Nicocado Avocado', 'Technoblade', 'Snoop Dogg Warzone',
    'Ruok FF', 'Quandale Dingle And Goofy Ahh Uncle',
    // Meme-specific
    'Dank Memes', 'Funny Trolling', 'Funny', 'Sheesh', 'Reeee',
    'Exposed Nerve Meme', 'Taco Bell', 'Law And Order', 'THX', 'Purge',
    'E Girl', 'Onii Chan', 'Allahu Akbar', 'Hentai', 'pe**s Music',
    // Music brands
    'Pop', 'Dj', 'Bass Drop',
];

// Anything NOT in the copyrighted list → 'unknown' (needs admin review)
// This covers: null, sound FX categories (animals, guns, ambience, etc.), Random, etc.

const NO_LICENSE = { $or: [{ license: { $exists: false } }, { license: null }, { license: '' }] };

async function main() {
    console.log('\n🏷️   SoundEffectPro — License Migration');
    console.log(`    Mode: ${DRY_RUN ? '🟡 DRY RUN (no changes)' : '🔴 APPLY (writing to DB)'}`);
    console.log('─'.repeat(60));

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const col = client.db('soundfx').collection('files');

    const total         = await col.countDocuments();
    const alreadyTagged = await col.countDocuments({ license: { $exists: true, $nin: [null, ''] } });
    const needsLicense  = total - alreadyTagged;

    console.log(`\n📊  Total sounds:          ${total}`);
    console.log(`    Already have license:  ${alreadyTagged}`);
    console.log(`    Need license field:    ${needsLicense}\n`);

    const willCopyright = await col.countDocuments({
        category: { $in: COPYRIGHTED_CATEGORIES },
        ...NO_LICENSE,
    });
    const willUnknown = needsLicense - willCopyright;

    console.log(`    Will mark ${willCopyright} sounds as 'copyrighted'`);
    console.log(`    Will mark ${willUnknown} sounds as 'unknown' (null categories + ambiguous SFX)`);
    console.log(`\n    Note: 'unknown' sounds surface in the admin panel for manual review.\n`);

    if (DRY_RUN) {
        console.log('🟡  DRY RUN — no changes made.');
        console.log('    Run with --apply to write these changes:\n');
        console.log('    node scripts/migrateLicense.mjs --apply\n');
        await client.close();
        return;
    }

    // 1. Mark known copyrighted categories
    const r1 = await col.updateMany(
        { category: { $in: COPYRIGHTED_CATEGORIES }, ...NO_LICENSE },
        { $set: { license: 'copyrighted' } }
    );

    // 2. Everything else (including null category) → unknown
    const r2 = await col.updateMany(
        NO_LICENSE,
        { $set: { license: 'unknown' } }
    );

    console.log(`✅  Marked ${r1.modifiedCount} sounds as 'copyrighted'`);
    console.log(`✅  Marked ${r2.modifiedCount} sounds as 'unknown'`);
    console.log('\n    Next steps:');
    console.log('    1. Review "unknown" sounds in the admin panel (bulk update available)');
    console.log('    2. Seed trendScores: GET /api/cron/recompute-trend?secret=<CRON_SECRET>');
    console.log('    3. Add CRON_SECRET to Railway env vars and schedule nightly cron\n');

    await client.close();
}

main().catch(err => { console.error('\n❌', err.message); process.exit(1); });
