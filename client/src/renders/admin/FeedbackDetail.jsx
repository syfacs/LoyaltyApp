import { useParams } from "react-router-dom";
import { ROUTES } from "../../constants.js";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Rows from "../../components/Rows.jsx";
import useLoad from "../../services/useLoad.js";
import { adminApi } from "../../services/api.js";

export default function FeedbackDetail() {
    const { id } = useParams();

    const { data, loading, error, reload } = useLoad(() => adminApi.feedback(id), [id]);
    const item = data?.feedback;

    return (
        <>
            <PageHeader title="Feedback" back={ROUTES.admin.feedback} />

            <div className="content">
                <Status loading={loading} error={error} onRetry={reload} />

                {item && (
                    <>
                        <Rows
                            items={[
                                ["Title", item.title],
                                ["Rating", item.rating ? `${"★".repeat(Number(item.rating) || 0)} (${item.rating}/5)` : ""],
                                ["Category", item.category],
                                ["Outlet", item.location],
                                ["Member", item.memberName ? `${item.memberName} (#${item.memberId})` : "Guest"],
                            ]}
                        />

                        <div className="card">
                            <div className="card-title">Message</div>
                            <p className="pre">{item.description}</p>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
