// the colour of a badge for each status the server can send
const COLORS = {
    Active: "success",
    Success: "success",
    Approve: "success",
    Approved: "success",
    Pending: "warning",
    Upcoming: "info",
    Rejected: "danger",
    Failed: "danger",
    Inactive: "danger",
    Deactive: "danger",
    Expired: "muted",
    Used: "muted",
};

const LABELS = { Approve: "Approved", Deactive: "Inactive" };

export default function StatusBadge({ status }) {
    const color = COLORS[status] ?? "muted";

    return <span className={`badge badge-${color}`}>{LABELS[status] ?? status}</span>;
}
