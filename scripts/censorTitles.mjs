/**
 * ── DB Cleanup: Censor profanity in sound titles ─────────────────────────────
 *
 * Replaces profanity words with censored versions:
 *   "fuck"     → "f**k"
 *   "shit"     → "s**t"
 *   "asshole"  → "a*****e"
 *   etc.
 *
 * Rules:
 *   • Only `title` is updated — slug (URL) and visibility are NOT touched
 *   • Word-boundary matching only — "bass", "classic", "assume" are NOT affected
 *   • Case is preserved — "FUCK" → "F**K", "Shit" → "S**t"
 *   • Tags are left as-is (short metadata, less visible to AdSense than H1)
 *
 * Usage:
 *   node scripts/censorTitles.mjs           ← dry run, shows before/after
 *   node scripts/censorTitles.mjs --apply   ← writes changes to DB
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

// ── Words to censor and their replacements ────────────────────────────────────
// Ordered longest-first so compound words match before their substrings.
// "bullshit" is checked before "shit", "asshole" before "ass", etc.
const CENSOR_WORDS = [
    // Compound first
    'bullshit',
    'asshole',
    'bullshitting',
    // Then standalone
    'fucking',
    'fucked',
    'fuckin',
    'fuck',
    'shitting',
    'shitted',
    'shitty',
    'shit',
    'asshole',
    'ass',
    'cunts',
    'cunt',
    'whores',
    'whore',
    'sluts',
    'slut',
    'bitches',
    'bitch',
    'bastards',
    'bastard',
    'pussies',
    'pussy',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Censor a word: keep first + last letter, fill middle with asterisks.
 * Preserves the original casing of the matched text.
 *   "fuck"    → "f**k"
 *   "SHIT"    → "S**T"
 *   "Bastard" → "B*****d"
 */
function censorMatch(matched) {
    if (matched.length <= 2) return matched;
    return matched[0] + '*'.repeat(matched.length - 2) + matched[matched.length - 1];
}

/**
 * Replace all profanity occurrences in `text` with censored versions.
 * Uses word-boundary regex so partial matches inside other words are skipped.
 */
function censorText(text) {
    if (!text) return text;
    let result = text;
    for (const word of CENSOR_WORDS) {
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Negative lookbehind/ahead ensures we match whole words only
        const re = new RegExp(`(?<![a-z0-9])(${escaped})(?![a-z0-9])`, 'gi');
        result = result.replace(re, (match) => censorMatch(match));
    }
    return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n✏️   SoundEffectPro — Title Censoring');
    console.log(`    Mode: ${DRY_RUN ? '🟡 DRY RUN (no changes)' : '🔴 APPLY (writing to DB)'}`);
    console.log('─'.repeat(60));

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const col = client.db('soundfx').collection('files');

    // Fetch all files (visible AND hidden — hidden ones should also get clean titles)
    const cursor = col.find({}, { projection: { _id: 1, s_id: 1, title: 1 } });

    const toUpdate = [];

    for await (const doc of cursor) {
        const censored = censorText(doc.title);
        if (censored !== doc.title) {
            toUpdate.push({ _id: doc._id, s_id: doc.s_id, before: doc.title, after: censored });
        }
    }

    console.log(`\n📋  ${toUpdate.length} title(s) will be censored:\n`);

    if (toUpdate.length === 0) {
        console.log('   ✅  All titles are already clean.\n');
        await client.close();
        return;
    }

    for (const item of toUpdate) {
        console.log(`   [${item.s_id}]`);
        console.log(`   Before: "${item.before}"`);
        console.log(`   After:  "${item.after}"\n`);
    }

    if (DRY_RUN) {
        console.log('🟡  DRY RUN — no changes made.');
        console.log('    Run with --apply to write these changes:\n');
        console.log('    node scripts/censorTitles.mjs --apply\n');
        await client.close();
        return;
    }

    // Apply updates one by one to preserve accuracy
    let updated = 0;
    for (const item of toUpdate) {
        await col.updateOne(
            { _id: item._id },
            { $set: { title: item.after } }
        );
        updated++;
    }

    console.log(`✅  Updated ${updated} title(s) successfully.`);
    console.log('    Slugs and URLs are unchanged.\n');

    await client.close();
}

main().catch(err => { console.error('\n❌', err.message); process.exit(1); });
