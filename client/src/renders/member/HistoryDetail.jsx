import { useParams } from "react-router-dom";
import { POINTS_LABEL, ROUTES } from "../../constants.js";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Rows from "../../components/Rows.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import useLoad from "../../services/useLoad.js";
import { memberApi } from "../../services/api.js";
import { formatDateTime, formatPoints } from "../../utils/format.js";

const TYPE_LABELS = { Point: "Points", Reward: "Reward", Voucher: "Voucher" };

// the details of one line of the history (the server has no call for a single line, so we find it in the list)
export default function HistoryDetail() {
    const { guid } = useParams();

    const { data, loading, error, reload } = useLoad(() => memberApi.history("All", ""), []);
    const item = data?.history.find((entry) => entry.guid === guid);

    return (
        <>
            <PageHeader title="Redemption details" back={ROUTES.member.history} />

            <div className="content">
                <Status loading={loading} error={error} onRetry={reload} />

                {data && !item && <div className="empty">This record could not be found.</div>}

                {item && (
                    <Rows
                        items={[
                            ["Type", TYPE_LABELS[item.type] ?? item.type],
                            ["Item", item.title],
                            ["Date / time", formatDateTime(item.date)],
                            ["Status", <StatusBadge key="status" status={item.status} />],
                            ["Points", item.points ? `${formatPoints(item.points)} ${POINTS_LABEL}` : ""],
                            ["Details", item.description],
                            ["Remark", item.remark],
                            ["Receipt no.", item.guid],
                        ]}
                    />
                )}
            </div>
        </>
    );
}
