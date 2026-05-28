/**
 * ── Content Moderation — Banned Words ───────────────────────────────────────
 *
 * Single source of truth for all content filtering across the app.
 * Covers terms that violate Google AdSense Publisher Policies:
 *   • Hate speech (racial/ethnic/homophobic slurs)
 *   • Sexual violence
 *   • Extremist content
 *
 * Applied in three layers:
 *   Layer 1 — Upload API     : blocks content from being saved to DB
 *   Layer 2 — Search page    : silently suppresses results, hides query from metadata
 *   Layer 3 — robots.txt     : prevents search query URLs from being crawled/indexed
 */

// ── Leet-speak / character substitution normaliser ───────────────────────────
const LEET_MAP: Record<string, string> = {
    '0': 'o', '1': 'i', '3': 'e', '4': 'a',
    '5': 's', '6': 'g', '7': 't', '8': 'b',
    '@': 'a', '$': 's', '!': 'i', '+': 't',
};

/**
 * Normalise a string for comparison:
 *   lowercase → leet substitution → strip non-alphanumeric → collapse spaces
 */
export function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .split('')
        .map(c => LEET_MAP[c] ?? c)
        .join('')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// ── Word lists (grouped for readability / future maintenance) ─────────────────

/** Racial & ethnic slurs — hardest AdSense violation category */
const RACIAL_SLURS = [
    'nigger', 'nigga', 'nigg',
    'chink', 'gook', 'spic', 'spick', 'beaner',
    'kike', 'hymie', 'wetback', 'raghead', 'towelhead',
    'coon', 'jigaboo', 'sambo', 'zipperhead', 'slope',
];

/** Homophobic / transphobic slurs */
const HOMOPHOBIC_SLURS = [
    'faggot', 'faggots', 'dyke', 'tranny', 'shemale',
];

/** Hate-speech phrases (multi-word — matched as substrings) */
const HATE_PHRASES = [
    'heil hitler', 'white power', 'white supremacy',
    'gas the jews', 'kill all', 'death to',
];

/** Child safety & sexual violence */
const SEXUAL_VIOLENCE = [
    'child porn', 'childporn', 'cp porn',
    'rape', 'molest', 'pedophile', 'pedo ',
];

// ── Master list ───────────────────────────────────────────────────────────────

export const BANNED_WORDS: readonly string[] = [
    ...RACIAL_SLURS,
    ...HOMOPHOBIC_SLURS,
    ...HATE_PHRASES,
    ...SEXUAL_VIOLENCE,
];

// ── Matching helpers ──────────────────────────────────────────────────────────

/**
 * Word-boundary match — avoids false positives on substrings.
 * e.g. "bass" does NOT match "ass", "classic" does NOT match anything.
 */
function wordBoundaryMatch(normalized: string, word: string): boolean {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i');
    return re.test(normalized);
}

/**
 * Returns true if the text contains any banned word or phrase.
 * Handles leet-speak obfuscation automatically.
 */
export function containsBannedWord(text: string): boolean {
    if (!text?.trim()) return false;
    const normalized = normalizeText(text);
    return BANNED_WORDS.some(word =>
        word.includes(' ')
            ? normalized.includes(word)          // phrase: substring match
            : wordBoundaryMatch(normalized, word) // single word: boundary match
    );
}

/**
 * Returns the first matched banned word (for server-side logging only).
 * Never expose this to client responses.
 */
export function findBannedWord(text: string): string | null {
    if (!text?.trim()) return null;
    const normalized = normalizeText(text);
    return BANNED_WORDS.find(word =>
        word.includes(' ')
            ? normalized.includes(word)
            : wordBoundaryMatch(normalized, word)
    ) ?? null;
}
