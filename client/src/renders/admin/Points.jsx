import { useState } from "react";
import { Link } from "react-router-dom";
import { POINTS_LABEL, ROUTES } from "../../constants.js";
import Field from "../../components/Field.jsx";
import Icon from "../../components/Icon.jsx";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { Tabs } from "../../components/Tabs.jsx";
import useLoad from "../../services/useLoad.js";
import { adminApi } from "../../services/api.js";
import { formatDateTime } from "../../utils/format.js";

const A = ROUTES.admin;

const STATUS_TABS = [
    { value: "", label: "All" },
    { value: "Pending", label: "Pending" },
    { value: "Approve", label: "Approved" },
    { value: "Rejected", label: "Rejected" },
];

export default function Points() {
    const [outletId, setOutletId] = useState("");
    const [status, setStatus] = useState("");

    // the records (filtered by outlet on the server) and the outlets for the filter
    const { data, loading, error, reload } = useLoad(async () => {
        const [points, outlets] = await Promise.all([adminApi.points(outletId), adminApi.outlets()]);

        return { points: points.points, outlets: outlets.outlets };
    }, [outletId]);

    const records = (data?.points ?? []).filter((record) => !status || record.status === status);

    return (
        <>
            <PageHeader
                title="Point records"
                back={A.home}
                right={
                    <Link className="header-action" to={A.assignPoints}>
                        + Add points
                    </Link>
                }
            />

            <div className="content">
                <Field label="Outlet" as="select" value={outletId} onChange={(event) => setOutletId(event.target.value)}>
                    <option value="">All outlets</option>
                    {data?.outlets.map((outlet) => (
                        <option key={outlet.id} value={outlet.id}>
                            {outlet.name}
                        </option>
                    ))}
                </Field>

                {outletId && (
                    <p className="field-hint" style={{ marginTop: -8, marginBottom: 12 }}>
                        Records that no staff member has approved yet do not belong to an outlet, so they are not shown here.
                    </p>
                )}

                <Tabs options={STATUS_TABS} value={status} onChange={setStatus} />

                <Status loading={loading} error={error} onRetry={reload} />

                {data && records.length === 0 && <div className="empty">No point records.</div>}

                {records.map((record) => (
                    <Link key={record.id} className="list-item" to={A.point(record.id)}>
                        <div className="grow">
                            <div className="title">{record.memberName ?? "Unknown member"}</div>
                            <div className="meta">{record.memberPhone}</div>
                            <div className="meta">{formatDateTime(record.date)}</div>
                        </div>

                        <div className="center">
                            <b style={{ color: "var(--primary)" }}>
                                +{record.point} {POINTS_LABEL}
                            </b>
                            <div>
                                <StatusBadge status={record.status} />
                            </div>
                        </div>

                        <Icon name="next" size={18} />
                    </Link>
                ))}
            </div>
        </>
    );
}
