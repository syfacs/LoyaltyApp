import { useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../constants.js";
import Icon from "../../components/Icon.jsx";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SearchBox from "../../components/SearchBox.jsx";
import { Tabs } from "../../components/Tabs.jsx";
import useLoad from "../../services/useLoad.js";
import { adminApi } from "../../services/api.js";
import { formatDateTime } from "../../utils/format.js";

const A = ROUTES.admin;

const TABS = [
    { value: "rewards", label: "Rewards" },
    { value: "vouchers", label: "Vouchers" },
];

export default function Redemptions() {
    const { data, loading, error, reload } = useLoad(() => adminApi.redemptions(), []);

    const [tab, setTab] = useState("rewards");
    const [search, setSearch] = useState("");

    const text = search.trim().toLowerCase();
    const records = (data?.[tab] ?? []).filter((record) =>
        `${record.title} ${record.memberName} ${record.memberPhone} ${record.outletName}`.toLowerCase().includes(text),
    );

    return (
        <>
            <PageHeader title="Redemptions" back={A.home} />

            <div className="content">
                <Tabs options={TABS} value={tab} onChange={setTab} />
                <SearchBox value={search} onChange={setSearch} placeholder="Search item, member or outlet" />

                <Status loading={loading} error={error} onRetry={reload} />

                {data && records.length === 0 && <div className="empty">No redemptions.</div>}

                {records.map((record) => (
                    <Link key={`${record.type}-${record.id}`} className="list-item" to={A.redemption(record.type.toLowerCase(), record.id)}>
                        <div className="grow">
                            <div className="title">{record.title}</div>
                            <div className="meta">
                                {record.memberName} - {record.memberPhone}
                            </div>
                            <div className="meta">
                                {record.outletName} - {formatDateTime(record.date)}
                            </div>
                        </div>

                        <Icon name="next" size={18} />
                    </Link>
                ))}
            </div>
        </>
    );
}
