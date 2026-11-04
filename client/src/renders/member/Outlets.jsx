import { Link } from "react-router-dom";
import { ROUTES } from "../../constants.js";
import Icon from "../../components/Icon.jsx";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import useLoad from "../../services/useLoad.js";
import { memberApi } from "../../services/api.js";

export default function Outlets() {
    const { data, loading, error, reload } = useLoad(() => memberApi.outlets(), []);

    return (
        <>
            <PageHeader title="Outlets" back={false} />

            <div className="content">
                <Status loading={loading} error={error} onRetry={reload} />

                {data && data.outlets.length === 0 && <div className="empty">No outlets yet.</div>}

                {data?.outlets.map((outlet) => (
                    <Link key={outlet.guid} className="list-item" to={ROUTES.member.outlet(outlet.guid)}>
                        <span className="quick-icon" style={{ width: 44, height: 44, display: "grid", placeItems: "center", color: "var(--primary)", background: "var(--primary-soft)", borderRadius: 14 }}>
                            <Icon name="pin" />
                        </span>

                        <div className="grow">
                            <div className="title">{outlet.name}</div>
                            <div className="meta">Tap to see the staff</div>
                        </div>

                        <Icon name="next" size={18} />
                    </Link>
                ))}
            </div>
        </>
    );
}
