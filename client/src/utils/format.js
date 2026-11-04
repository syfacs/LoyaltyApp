// small helpers to show dates and numbers the same way everywhere

const LOCALE = "en-MY";

export function formatDate(value) {
    if (!value) return "-";

    return new Date(value).toLocaleDateString(LOCALE, { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
    if (!value) return "-";

    const date = new Date(value);
    const day = date.toLocaleDateString(LOCALE, { day: "2-digit", month: "short", year: "numeric" });
    const time = date.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });

    return `${day}, ${time}`;
}

// "2026-11-30T23:59:59" becomes "2026-11-30" (what a date input wants)
export function toDateInput(value) {
    return value ? String(value).slice(0, 10) : "";
}

// "November 2026", used to group lists by month
export function monthLabel(value) {
    if (!value) return "Unknown date";

    return new Date(value).toLocaleDateString("en", { month: "long", year: "numeric" });
}

// a date input value for today, or for some days from today: dateInput() and dateInput(30)
export function dateInput(daysFromToday = 0) {
    const day = new Date();
    day.setDate(day.getDate() + daysFromToday);

    return day.toISOString().slice(0, 10);
}

export function greeting() {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";

    return "Good evening";
}

export function formatPoints(points) {
    return Number(points ?? 0).toLocaleString(LOCALE);
}
