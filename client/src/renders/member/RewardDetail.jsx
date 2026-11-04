import { Link, useLocation, useParams } from "react-router-dom";
import { POINTS_LABEL, ROUTES } from "../../constants.js";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import RedeemForm from "../../components/RedeemForm.jsx";
import Rows from "../../components/Rows.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import Thumb from "../../components/Thumb.jsx";
import { useAuth } from "../../context/AuthContext.js";
import { useToast } from "../../context/ToastContext.js";
import useLoad from "../../services/useLoad.js";
import { memberApi } from "../../services/api.js";
import { formatDate, formatPoints } from "../../utils/format.js";

const R = ROUTES.member;

export default function RewardDetail() {
    const { guid } = useParams();
    const location = useLocation();
    const toast = useToast();
    const { setPoints } = useAuth();

    const { data, loading, error, reload } = useLoad(() => memberApi.reward(guid), [guid]);
    const reward = data?.reward;

    async function redeem(values) {
        try {
            const response = await memberApi.redeemReward({ itemGuid: guid, ...values });

            toast.success(response.message);
            setPoints(response.points);
            reload();

            return true;
        } catch (err) {
            if (!err.sessionExpired) toast.error(err.message);

            return false;
        }
    }

    // what the member can do with this reward
    function renderAction() {
        if (!data.loggedIn) {
            return (
                <Link className="btn btn-block" to={R.login} state={{ from: location.pathname }}>
                    Log in to redeem
                </Link>
            );
        }

        if (reward.status !== "Active") return <div className="alert alert-warning">This reward is not available.</div>;

        if (data.alreadyRedeemed) return <div className="alert alert-info">You have already redeemed this reward.</div>;

        if (data.points < reward.point) {
            return (
                <div className="alert alert-warning">
                    Not enough points. You have {formatPoints(data.points)} {POINTS_LABEL} and need{" "}
                    {formatPoints(reward.point - data.points)} more.
                </div>
            );
        }

        return <RedeemForm buttonLabel={`Redeem for ${formatPoints(reward.point)} ${POINTS_LABEL}`} onSubmit={redeem} />;
    }

    return (
        <>
            <PageHeader title="Reward" back={R.rewards} />

            <div className="content">
                <Status loading={loading} error={error} onRetry={reload} />

                {reward && (
                    <>
                        <div className="card">
                            <Thumb src={reward.imageUrl} alt={reward.title ?? reward.name} />

                            <h2 style={{ marginTop: 14 }}>{reward.title ?? reward.name}</h2>
                            {reward.subTitle && <p className="muted">{reward.subTitle}</p>}

                            <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                                <span className="cost">
                                    {formatPoints(reward.point)} {POINTS_LABEL}
                                </span>
                                <StatusBadge status={reward.status} />
                            </div>
                        </div>

                        <Rows
                            items={[
                                ["Valid from", formatDate(reward.createDate)],
                                ["Valid until", formatDate(reward.expireDate)],
                                ...(data.loggedIn ? [["Your points", `${formatPoints(data.points)} ${POINTS_LABEL}`]] : []),
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

                        {renderAction()}
                    </>
                )}
            </div>
        </>
    );
}
