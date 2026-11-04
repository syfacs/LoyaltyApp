import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { POINTS_LABEL, ROUTES } from "../../constants.js";
import Field from "../../components/Field.jsx";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Rows from "../../components/Rows.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { useToast } from "../../context/ToastContext.js";
import useLoad from "../../services/useLoad.js";
import { adminApi } from "../../services/api.js";
import { formatDateTime } from "../../utils/format.js";
import { checkRequired, onlyErrors } from "../../utils/validators.js";
import useForm from "../../utils/useForm.js";

const A = ROUTES.admin;

export default function PointDetail() {
    const { id } = useParams();

    const { data, loading, error, reload } = useLoad(async () => {
        const [point, outlets] = await Promise.all([adminApi.point(id), adminApi.outlets()]);

        return { point: point.point, outlets: outlets.outlets };
    }, [id]);

    const record = data?.point;

    return (
        <>
            <PageHeader title="Point record" back={A.points} />

            <div className="content">
                <Status loading={loading} error={error} onRetry={reload} />

                {record && (
                    <>
                        <Rows
                            items={[
                                ["Member", record.memberName],
                                ["Phone", record.memberPhone],
                                ["Points", `${record.point} ${POINTS_LABEL}`],
                                ["Status", <StatusBadge key="status" status={record.status} />],
                                ["Date", formatDateTime(record.date)],
                                ["Outlet", record.outletName],
                                ["Approved by", record.staffName],
                                ["Code", record.code],
                                ["Description", record.description],
                                ["Remark", record.remark],
                                ["Record id", record.guid],
                            ]}
                        />

                        {record.status !== "Rejected" && <RejectForm record={record} outlets={data.outlets} onDone={reload} />}
                    </>
                )}
            </div>
        </>
    );
}

// rejecting a record takes the points back from the member
function RejectForm({ record, outlets, onDone }) {
    const toast = useToast();
    const navigate = useNavigate();

    const form = useForm({ reason: "", outletId: record.outletId ?? "" });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        const found = onlyErrors({
            reason: checkRequired(form.values.reason, "Reason"),
            outletId: checkRequired(form.values.outletId, "Outlet"),
        });
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        if (!window.confirm("Reject this point record?")) return;

        setBusy(true);

        try {
            const response = await adminApi.rejectPoint({
                pointRecordID: record.id,
                reason: form.values.reason,
                outletID: Number(form.values.outletId),
            });

            toast.success(response.message);
            onDone();
            navigate(A.points, { replace: true });
        } catch (err) {
            if (!err.sessionExpired) toast.error(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <form className="card" onSubmit={handleSubmit} noValidate>
            <div className="card-title">Reject this record</div>

            <Field label="Reason" as="textarea" error={errors.reason} {...form.bind("reason")} />

            <Field
                label="Outlet"
                as="select"
                hint="The server uses a staff PIN of this outlet to confirm the rejection."
                error={errors.outletId}
                {...form.bind("outletId")}
            >
                <option value="">Choose an outlet</option>
                {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                        {outlet.name}
                    </option>
                ))}
            </Field>

            <button type="submit" className="btn btn-danger btn-block" disabled={busy}>
                {busy ? "Please wait..." : "Reject record"}
            </button>
        </form>
    );
}
