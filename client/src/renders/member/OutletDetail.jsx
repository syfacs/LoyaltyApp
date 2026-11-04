import { Link, useLocation, useParams } from "react-router-dom";
import { ROUTES } from "../../constants.js";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Rows from "../../components/Rows.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import useLoad from "../../services/useLoad.js";
import { memberApi } from "../../services/api.js";
import { formatDate } from "../../utils/format.js";

const R = ROUTES.member;

export default function OutletDetail() {
    const { guid } = useParams();
    const location = useLocation();

    const { data, loading, error, reload } = useLoad(() => memberApi.outlet(guid), [guid]);

    return (
        <>
            <PageHeader title="Outlet" back={R.outlets} />

            <div className="content">
                <Status loading={loading} error={error} onRetry={reload} />

                {data && (
                    <>
                        <h2 style={{ marginBottom: 12 }}>{data.outlet.name}</h2>

                        <Rows
                            items={[
                                ["Status", <StatusBadge key="status" status={data.outlet.status} />],
                                ["Open since", formatDate(data.outlet.createdDate)],
                            ]}
                        />

                        <div className="section-title">Staff</div>

                        {!data.loggedIn && (
                            <div className="alert alert-info">
                                <Link to={R.login} state={{ from: location.pathname }}>
                                    Log in
                                </Link>{" "}
                                to see the staff of this outlet.
                            </div>
                        )}

                        {data.loggedIn && data.staff.length === 0 && <div className="empty">No staff listed.</div>}

                        {data.staff.map((person) => (
                            <div key={person.id} className="list-item">
                                <span className="avatar" style={{ width: 40, height: 40, fontSize: "1rem" }}>
                                    {person.name?.[0]?.toUpperCase()}
                                </span>

                                <div className="grow">
                                    <div className="title">{person.name}</div>
                                    {person.role && <div className="meta">{person.role}</div>}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </>
    );
}
