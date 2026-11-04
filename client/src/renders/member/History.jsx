import { useState } from "react";
import { Link } from "react-router-dom";
import { HISTORY_RANGES, HISTORY_TYPES, POINTS_LABEL, ROUTES } from "../../constants.js";
import Field from "../../components/Field.jsx";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SearchBox from "../../components/SearchBox.jsx";
import useLoad from "../../services/useLoad.js";
import { memberApi } from "../../services/api.js";
import { formatDateTime, formatPoints, monthLabel } from "../../utils/format.js";

const R = ROUTES.member;

const STATUS_COLORS = { Pending: "var(--warning)", Success: "var(--success)", Approve: "var(--success)", Rejected: "var(--danger)", Failed: "var(--danger)" };

const TYPE_LABELS = { Point: "Collect Points", Reward: "Redeem Reward", Voucher: "Redeem Voucher" };

// the points of an item: points are added, rewards are paid with points
function pointsText(item) {
    if (!item.points) return "";

    if (item.type === "Point") return `+ ${formatPoints(item.points)} ${POINTS_LABEL}`;
    if (item.type === "Reward") return `- ${formatPoints(item.points)} ${POINTS_LABEL}`;

    return "";
}

// puts the items in groups, one group for each month: [["July 2026", [item, item]], ...]
function groupByMonth(items) {
    const groups = new Map();

    items.forEach((item) => {
        const key = monthLabel(item.date);

        groups.set(key, [...(groups.get(key) ?? []), item]);
    });

    return [...groups.entries()];
}

export default function History() {
    const [type, setType] = useState("");
    const [range, setRange] = useState("All");
    const [search, setSearch] = useState("");

    // the server filters by type and date, the search box filters what came back
    const { data, loading, error, reload } = useLoad(() => memberApi.history(range, type), [range, type]);

    const text = search.trim().toLowerCase();
    const items = (data?.history ?? []).filter((item) =>
        `${item.title} ${item.guid} ${item.description ?? ""}`.toLowerCase().includes(text),
    );

    return (
        <>
            <PageHeader title="History" back={R.account} />

            <div className="content">
                <div className="filters">
                    <Field as="select" value={type} onChange={(event) => setType(event.target.value)}>
                        {HISTORY_TYPES.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Field>

                    <Field as="select" value={range} onChange={(event) => setRange(event.target.value)}>
                        {HISTORY_RANGES.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Field>
                </div>

                <SearchBox value={search} onChange={setSearch} placeholder="Search your history" />

                <Status loading={loading} error={error} onRetry={reload} />

                {data && items.length === 0 && <div className="empty">Nothing here yet.</div>}

                {groupByMonth(items).map(([month, group]) => (
                    <div key={month}>
                        <div className="month-title">{month}</div>

                        {group.map((item) => (
                            <Link key={item.guid} className="list-item" to={R.historyItem(item.guid)}>
                                <div className="grow">
                                    <div className="title">{TYPE_LABELS[item.type] ?? item.type}</div>
                                    <div className="meta">{item.title}</div>
                                    <div className="meta">Receipt ID: {item.guid.slice(0, 24)}...</div>
                                    <div className="meta">{formatDateTime(item.date)}</div>
                                    <div className="small" style={{ color: STATUS_COLORS[item.status], fontWeight: 600 }}>
                                        {item.status === "Approve" ? "Approved" : item.status}
                                    </div>
                                </div>

                                <b style={{ color: "var(--primary)" }}>{pointsText(item)}</b>
                            </Link>
                        ))}
                    </div>
                ))}
            </div>
        </>
    );
}
