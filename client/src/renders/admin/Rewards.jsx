import { Link } from "react-router-dom";
import { POINTS_LABEL, ROUTES } from "../../constants.js";
import Icon from "../../components/Icon.jsx";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import Thumb from "../../components/Thumb.jsx";
import useLoad from "../../services/useLoad.js";
import { adminApi } from "../../services/api.js";
import { formatDate, formatPoints } from "../../utils/format.js";

const A = ROUTES.admin;

export default function Rewards() {
    const { data, loading, error, reload } = useLoad(() => adminApi.rewards(), []);

    return (
        <>
            <PageHeader
                title="Rewards"
                back={A.home}
                right={
                    <Link className="header-action" to={A.newReward}>
                        + New
                    </Link>
                }
            />

            <div className="content">
                <Status loading={loading} error={error} onRetry={reload} />

                {data && data.rewards.length === 0 && <div className="empty">No rewards yet.</div>}

                {data?.rewards.map((reward) => (
                    <Link key={reward.id} className="list-item" to={A.reward(reward.id)}>
                        <Thumb small src={reward.imageUrl} alt={reward.name} />

                        <div className="grow">
                            <div className="title">{reward.title ?? reward.name}</div>
                            <div className="meta">
                                {formatPoints(reward.point)} {POINTS_LABEL} - until {formatDate(reward.expireDate)}
                            </div>
                        </div>

                        <StatusBadge status={reward.status} />
                        <Icon name="next" size={18} />
                    </Link>
                ))}
            </div>
        </>
    );
}
