import { useParams } from "react-router-dom";
import { ROUTES } from "../../constants.js";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Rows from "../../components/Rows.jsx";
import useLoad from "../../services/useLoad.js";
import { adminApi } from "../../services/api.js";
import { formatDateTime } from "../../utils/format.js";

export default function RedemptionDetail() {
    const { type, id } = useParams();

    const { data, loading, error, reload } = useLoad(() => adminApi.redemption(type, id), [type, id]);
    const record = data?.redemption;

    return (
        <>
            <PageHeader title="Redemption" back={ROUTES.admin.redemptions} />

            <div className="content">
                <Status loading={loading} error={error} onRetry={reload} />

                {record && (
                    <Rows
                        items={[
                            ["Type", record.type],
                            ["Item", record.title],
                            ["Description", record.description],
                            ["Member", record.memberName],
                            ["Phone", record.memberPhone],
                            ["Outlet", record.outletName],
                            ["Staff", record.staffName],
                            ["Date / time", formatDateTime(record.date)],
                            ["Record id", record.id],
                        ]}
                    />
                )}
            </div>
        </>
    );
}
