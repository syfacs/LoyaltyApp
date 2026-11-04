import { POINTS_LABEL, REWARD_TABS } from "../../constants.js";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import RewardCard from "../../components/RewardCard.jsx";
import { LinkTabs } from "../../components/Tabs.jsx";
import useLoad from "../../services/useLoad.js";
import { memberApi } from "../../services/api.js";
import { formatPoints } from "../../utils/format.js";

export default function Rewards() {
    const { data, loading, error, reload } = useLoad(() => memberApi.rewards(), []);

    return (
        <>
            <PageHeader title="Rewards" back={false} />

            <div className="content">
                <LinkTabs options={REWARD_TABS} />

                {data && data.points !== null && data.points !== undefined && (
                    <div className="alert alert-info">
                        You have{" "}
                        <b>
                            {formatPoints(data.points)} {POINTS_LABEL}
                        </b>{" "}
                        to spend.
                    </div>
                )}

                <Status loading={loading} error={error} onRetry={reload} />

                {data && data.rewards.length === 0 && <div className="empty">No rewards available right now.</div>}

                {data && (
                    <div className="grid-2">
                        {data.rewards.map((reward) => (
                            <RewardCard key={reward.guid} reward={reward} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
