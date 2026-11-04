import { useState } from "react";
import { Link } from "react-router-dom";
import { REWARD_TABS, ROUTES } from "../../constants.js";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SearchBox from "../../components/SearchBox.jsx";
import { LinkTabs, Tabs } from "../../components/Tabs.jsx";
import VoucherItem from "../../components/VoucherItem.jsx";
import useLoad from "../../services/useLoad.js";
import { memberApi } from "../../services/api.js";

const R = ROUTES.member;

const FILTERS = [
    { value: "active", label: "Available" },
    { value: "used", label: "Used" },
    { value: "expired", label: "Expired" },
];

export default function Vouchers() {
    const { data, loading, error, reload } = useLoad(() => memberApi.vouchers(), []);

    const [filter, setFilter] = useState("active");
    const [search, setSearch] = useState("");

    const text = search.trim().toLowerCase();
    const vouchers = (data?.[filter] ?? []).filter((voucher) =>
        `${voucher.name} ${voucher.title} ${voucher.subtitle}`.toLowerCase().includes(text),
    );

    return (
        <>
            <PageHeader title="Vouchers" back={false} />

            <div className="content">
                <LinkTabs options={REWARD_TABS} />

                {data && !data.loggedIn && (
                    <div className="alert alert-info">
                        <Link to={R.login} state={{ from: R.vouchers }}>
                            Log in
                        </Link>{" "}
                        to redeem vouchers and see the ones you have used.
                    </div>
                )}

                {data?.loggedIn && (
                    <Link className="btn btn-outline btn-block" style={{ marginBottom: 14 }} to={R.myVouchers}>
                        My vouchers
                    </Link>
                )}

                <Tabs options={FILTERS} value={filter} onChange={setFilter} />
                <SearchBox value={search} onChange={setSearch} placeholder="Search vouchers" />

                <Status loading={loading} error={error} onRetry={reload} />

                {data && vouchers.length === 0 && <div className="empty">No vouchers here.</div>}

                {vouchers.map((voucher) => (
                    <VoucherItem key={voucher.guid} voucher={voucher} status={filter === "active" ? null : FILTERS.find((f) => f.value === filter).label} />
                ))}
            </div>
        </>
    );
}
