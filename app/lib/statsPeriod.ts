export function getWeekStart(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
}

export function getMonthStart(): Date {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function getHalfYearStart(): Date {
    const d = new Date();
    const startMonth = d.getMonth() < 6 ? 0 : 6;
    return new Date(d.getFullYear(), startMonth, 1);
}

// ── Aggregation pipeline helpers ─────────────────────────────────────────────
//
// The old approach used $setOnInsert which only fires on document creation,
// so weekly/monthly counters NEVER reset — they accumulated forever like
// all-time totals. These pipeline builders fix that with $cond expressions
// that detect a stale periodStart and reset the whole period block atomically.
//
// Usage (both routes):
//   await File.findOneAndUpdate(filter, buildViewPipeline());
//   await File.findOneAndUpdate(filter, buildDownloadPipeline());

type Period = 'weekly' | 'monthly' | 'halfYearly';

/** Increment field if period is current; reset to `inc` if period is stale. */
function condIncrement(period: Period, field: string, periodStart: Date, inc: number) {
    return {
        $cond: {
            if:   { $lt: [`$stats.${period}.periodStart`, periodStart] },
            then: inc,
            else: { $add: [`$stats.${period}.${field}`, inc] },
        },
    };
}

/** Preserve field if period is current; reset to 0 if period is stale. */
function condPreserve(period: Period, field: string, periodStart: Date) {
    return {
        $cond: {
            if:   { $lt: [`$stats.${period}.periodStart`, periodStart] },
            then: 0,
            else: `$stats.${period}.${field}`,
        },
    };
}

/** Advance periodStart when stale; keep existing value when current. */
function condPeriodStart(period: Period, periodStart: Date) {
    return {
        $cond: {
            if:   { $lt: [`$stats.${period}.periodStart`, periodStart] },
            then: periodStart,
            else: `$stats.${period}.periodStart`,
        },
    };
}

/**
 * Aggregation pipeline that atomically increments views and auto-resets
 * stale period buckets (weekly / monthly / halfYearly).
 */
export function buildViewPipeline(): object[] {
    const week  = getWeekStart();
    const month = getMonthStart();
    const half  = getHalfYearStart();

    return [{
        $set: {
            'stats.views': { $add: ['$stats.views', 1] },

            'stats.weekly.views':       condIncrement('weekly', 'views', week, 1),
            'stats.weekly.downloads':   condPreserve ('weekly', 'downloads', week),
            'stats.weekly.likes':       condPreserve ('weekly', 'likes', week),
            'stats.weekly.periodStart': condPeriodStart('weekly', week),

            'stats.monthly.views':       condIncrement('monthly', 'views', month, 1),
            'stats.monthly.downloads':   condPreserve ('monthly', 'downloads', month),
            'stats.monthly.likes':       condPreserve ('monthly', 'likes', month),
            'stats.monthly.periodStart': condPeriodStart('monthly', month),

            'stats.halfYearly.views':       condIncrement('halfYearly', 'views', half, 1),
            'stats.halfYearly.downloads':   condPreserve ('halfYearly', 'downloads', half),
            'stats.halfYearly.likes':       condPreserve ('halfYearly', 'likes', half),
            'stats.halfYearly.periodStart': condPeriodStart('halfYearly', half),
        },
    }];
}

/**
 * Aggregation pipeline that atomically increments downloads and auto-resets
 * stale period buckets.
 */
export function buildDownloadPipeline(): object[] {
    const week  = getWeekStart();
    const month = getMonthStart();
    const half  = getHalfYearStart();

    return [{
        $set: {
            'stats.downloads': { $add: ['$stats.downloads', 1] },

            'stats.weekly.downloads':   condIncrement('weekly', 'downloads', week, 1),
            'stats.weekly.views':       condPreserve ('weekly', 'views', week),
            'stats.weekly.likes':       condPreserve ('weekly', 'likes', week),
            'stats.weekly.periodStart': condPeriodStart('weekly', week),

            'stats.monthly.downloads':   condIncrement('monthly', 'downloads', month, 1),
            'stats.monthly.views':       condPreserve ('monthly', 'views', month),
            'stats.monthly.likes':       condPreserve ('monthly', 'likes', month),
            'stats.monthly.periodStart': condPeriodStart('monthly', month),

            'stats.halfYearly.downloads':   condIncrement('halfYearly', 'downloads', half, 1),
            'stats.halfYearly.views':       condPreserve ('halfYearly', 'views', half),
            'stats.halfYearly.likes':       condPreserve ('halfYearly', 'likes', half),
            'stats.halfYearly.periodStart': condPeriodStart('halfYearly', half),
        },
    }];
}
