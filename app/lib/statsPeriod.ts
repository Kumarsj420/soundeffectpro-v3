export function getWeekStart() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
}

export function getMonthStart() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function getHalfYearStart() {
    const d = new Date();
    const startMonth = d.getMonth() < 6 ? 0 : 6;
    return new Date(d.getFullYear(), startMonth, 1);
}
