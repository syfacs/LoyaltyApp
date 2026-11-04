import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "../../constants.js";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Rows from "../../components/Rows.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import Thumb from "../../components/Thumb.jsx";
import { useToast } from "../../context/ToastContext.js";
import useLoad from "../../services/useLoad.js";
import { adminApi } from "../../services/api.js";
import { formatDate } from "../../utils/format.js";

const A = ROUTES.admin;

export default function HighlightDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    const { data, loading, error, reload } = useLoad(() => adminApi.highlight(id), [id]);
    const [busy, setBusy] = useState(false);

    const highlight = data?.highlight;

    async function handleDelete() {
        if (!window.confirm(`Delete "${highlight.title}"? This cannot be undone.`)) return;

        setBusy(true);

        try {
            const response = await adminApi.deleteHighlight(id);

            toast.success(response.message);
            navigate(A.highlights, { replace: true });
        } catch (err) {
            if (!err.sessionExpired) toast.error(err.message);
            setBusy(false);
        }
    }

    return (
        <>
            <PageHeader title="Highlight" back={A.highlights} />

            <div className="content">
                <Status loading={loading} error={error} onRetry={reload} />

                {highlight && (
                    <>
                        <div className="card">
                            <Thumb src={highlight.imageUrl} alt={highlight.title} />

                            <h2 style={{ marginTop: 14 }}>{highlight.title}</h2>
                            <div style={{ marginTop: 8 }}>
                                <StatusBadge status={highlight.status} />
                            </div>
                        </div>

                        <Rows
                            items={[
                                ["Sub title", highlight.subTitle],
                                ["Shown from", formatDate(highlight.createDate)],
                                ["Shown until", formatDate(highlight.expireDate)],
                            ]}
                        />

                        {highlight.description && (
                            <div className="card">
                                <div className="card-title">Details</div>
                                <p className="pre">{highlight.description}</p>
                            </div>
                        )}

                        {highlight.tnC && (
                            <div className="card">
                                <div className="card-title">Terms and conditions</div>
                                <p className="pre muted small">{highlight.tnC}</p>
                            </div>
                        )}

                        <div className="actions">
                            <Link className="btn" to={A.editHighlight(highlight.id)}>
                                Edit
                            </Link>

                            <button type="button" className="btn btn-danger-outline" onClick={handleDelete} disabled={busy}>
                                Delete
                            </button>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
