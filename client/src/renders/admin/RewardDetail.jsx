import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { POINTS_LABEL, ROUTES } from "../../constants.js";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Rows from "../../components/Rows.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import Thumb from "../../components/Thumb.jsx";
import { useToast } from "../../context/ToastContext.js";
import useLoad from "../../services/useLoad.js";
import { adminApi } from "../../services/api.js";
import { formatDate, formatPoints } from "../../utils/format.js";

const A = ROUTES.admin;

export default function RewardDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    const { data, loading, error, reload } = useLoad(() => adminApi.reward(id), [id]);
    const [busy, setBusy] = useState(false);

    const reward = data?.reward;

    async function handleDelete() {
        if (!window.confirm(`Delete "${reward.name}"? This cannot be undone.`)) return;

        setBusy(true);

        try {
            const response = await adminApi.deleteReward(id);

            toast.success(response.message);
            navigate(A.rewards, { replace: true });
        } catch (err) {
            if (!err.sessionExpired) toast.error(err.message);
            setBusy(false);
        }
    }

    return (
        <>
            <PageHeader title="Reward" back={A.rewards} />

            <div className="content">
                <Status loading={loading} error={error} onRetry={reload} />

                {reward && (
                    <>
                        <div className="card">
                            <Thumb src={reward.imageUrl} alt={reward.name} />

                            <h2 style={{ marginTop: 14 }}>{reward.title ?? reward.name}</h2>
                            <div style={{ marginTop: 8 }}>
                                <StatusBadge status={reward.status} />
                            </div>
                        </div>

                        <Rows
                            items={[
                                ["Name", reward.name],
                                ["Points needed", `${formatPoints(reward.point)} ${POINTS_LABEL}`],
                                ["Sub title", reward.subTitle],
                                ["Short title", reward.shortTitle],
                                ["Valid from", formatDate(reward.createDate)],
                                ["Valid until", formatDate(reward.expireDate)],
                            ]}
                        />

                        {reward.description && (
                            <div className="card">
                                <div className="card-title">Description</div>
                                <p className="pre">{reward.description}</p>
                            </div>
                        )}

                        {reward.tnC && (
                            <div className="card">
                                <div className="card-title">Terms and conditions</div>
                                <p className="pre muted small">{reward.tnC}</p>
                            </div>
                        )}

                        <div className="actions">
                            <Link className="btn" to={A.editReward(reward.id)}>
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
