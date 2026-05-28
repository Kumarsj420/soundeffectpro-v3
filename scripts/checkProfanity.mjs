/**
 * ── DB Audit: Check files containing strong profanity ───────────────────────
 *
 * These words (fuck, shit, ass, bitch, cunt, whore, slut) are borderline
 * for AdSense — they don't always cause violations but can if AdSense
 * crawls a page where they appear prominently in titles/tags.
 *
 * This script ONLY shows what exists. It does NOT hide anything.
 * Decide manually which to rename, retag, or hide.
 *
 * Usage:
 *   node scripts/checkProfanity.mjs
 */

import { readFileSync } from 'fs';
import { MongoClient } from 'mongodb';
import { resolve } from 'path';

// Load .env
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
} catch { process.exit(1); }

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1); }

// Profanity words to audit (not in the hard-block list)
const PROFANITY = [
    'fuck', 'fucking', 'fucked',
    'shit', 'bullshit',
    'bitch', 'bitches',
    'cunt',
    'whore', 'slut',
    'ass', 'asshole',
    'bastard',
    'damn', 'hell',
];

const LEET = { '0':'o','1':'i','3':'e','4':'a','5':'s','6':'g','7':'t','8':'b','@':'a','$':'s','!':'i','+':'t' };

function normalize(text) {
    return String(text ?? '').toLowerCase().split('').map(c => LEET[c] ?? c).join('')
        .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function wordBoundaryMatch(normalized, word) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i').test(normalized);
}

function findMatch(text) {
    if (!text) return null;
    const n = normalize(text);
    return PROFANITY.find(w => wordBoundaryMatch(n, w)) ?? null;
}

function checkDoc(doc) {
    return findMatch(doc.title) ||
           findMatch(doc.description) ||
           findMatch((doc.tags ?? []).join(' ')) || null;
}

async function main() {
    console.log('\n🔍  SoundEffectPro — Profanity Audit (read-only)\n' + '─'.repeat(60));

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const col = client.db('soundfx').collection('files');

    const cursor = col.find(
        { visibility: true },
        { projection: { s_id: 1, title: 1, description: 1, tags: 1 } }
    );

    const found = [];
    for await (const doc of cursor) {
        const hit = checkDoc(doc);
        if (hit) found.push({ s_id: doc.s_id, title: doc.title, matched: hit });
    }

    // Group by matched word
    const grouped = {};
    for (const item of found) {
        if (!grouped[item.matched]) grouped[item.matched] = [];
        grouped[item.matched].push(item);
    }

    if (found.length === 0) {
        console.log('\n✅  No profanity found in visible files.\n');
    } else {
        console.log(`\n📋  Found ${found.length} file(s) with strong profanity:\n`);
        for (const [word, items] of Object.entries(grouped)) {
            console.log(`  "${word}" — ${items.length} file(s):`);
            for (const item of items.slice(0, 10)) {
                console.log(`    • [${item.s_id}] "${item.title}"`);
            }
            if (items.length > 10) console.log(`    … and ${items.length - 10} more`);
            console.log('');
        }
        console.log('📌  These are NOT hidden — review manually and decide which to keep/rename/hide.');
        console.log('    AdSense tolerates occasional profanity in audio titles for entertainment sites.');
        console.log('    Sounds where the word IS the title (e.g. just "fuck") are higher risk.\n');
    }

    await client.close();
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
