import { Link } from "react-router-dom";
import { ROUTES } from "../../constants.js";
import Icon from "../../components/Icon.jsx";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import Thumb from "../../components/Thumb.jsx";
import useLoad from "../../services/useLoad.js";
import { adminApi } from "../../services/api.js";
import { formatDate } from "../../utils/format.js";

const A = ROUTES.admin;

export default function Highlights() {
    const { data, loading, error, reload } = useLoad(() => adminApi.highlights(), []);

    return (
        <>
            <PageHeader
                title="Highlights"
                back={A.home}
                right={
                    <Link className="header-action" to={A.newHighlight}>
                        + New
                    </Link>
                }
            />

            <div className="content">
                <p className="muted small" style={{ marginBottom: 12 }}>
                    Highlights are the promotions shown on the home page of the members.
                </p>

                <Status loading={loading} error={error} onRetry={reload} />

                {data && data.highlights.length === 0 && <div className="empty">No highlights yet.</div>}

                {data?.highlights.map((highlight) => (
                    <Link key={highlight.id} className="list-item" to={A.highlight(highlight.id)}>
                        <Thumb small src={highlight.imageUrl} alt={highlight.title} />

                        <div className="grow">
                            <div className="title">{highlight.title}</div>
                            <div className="meta">Until {formatDate(highlight.expireDate)}</div>
                        </div>

                        <StatusBadge status={highlight.status} />
                        <Icon name="next" size={18} />
                    </Link>
                ))}
            </div>
        </>
    );
}
