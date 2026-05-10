export const CATEGORIES = ['Meme', 'Anime', 'Gaming', 'Music', 'Movies', 'Sports', 'Series', 'Politics', 'Comedy', 'Random'] as const;
export type Category = typeof CATEGORIES[number];

export const CATEGORY_SLUGS: Record<string, Category> = {
    'meme': 'Meme',
    'anime': 'Anime',
    'gaming': 'Gaming',
    'music': 'Music',
    'movies': 'Movies',
    'sports': 'Sports',
    'series': 'Series',
    'politics': 'Politics',
    'comedy': 'Comedy',
    'random': 'Random',
};

export const REPORT_TYPES = [
    "hate speech",
    "abuse",
    "inappropriate content",
    "sexual content",
    "harassment and bullying",
    "terrorism advocacy",
    "misinformation",
    "spam and scams",
    "copyright violation",
    "privacy violation",
    "other",
] as const;

export type ReportType = typeof REPORT_TYPES[number];
