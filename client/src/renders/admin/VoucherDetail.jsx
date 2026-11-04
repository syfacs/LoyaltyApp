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

export default function VoucherDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    const { data, loading, error, reload } = useLoad(() => adminApi.voucher(id), [id]);
    const [busy, setBusy] = useState(false);

    const voucher = data?.voucher;

    async function handleDelete() {
        if (!window.confirm(`Delete "${voucher.name}"? This cannot be undone.`)) return;

        setBusy(true);

        try {
            const response = await adminApi.deleteVoucher(id);

            toast.success(response.message);
            navigate(A.vouchers, { replace: true });
        } catch (err) {
            if (!err.sessionExpired) toast.error(err.message);
            setBusy(false);
        }
    }

    return (
        <>
            <PageHeader title="Voucher" back={A.vouchers} />

            <div className="content">
                <Status loading={loading} error={error} onRetry={reload} />

                {voucher && (
                    <>
                        <div className="card">
                            <Thumb src={voucher.imageUrl} alt={voucher.name} />

                            <h2 style={{ marginTop: 14 }}>{voucher.title ?? voucher.name}</h2>
                            <div style={{ marginTop: 8 }}>
                                <StatusBadge status={voucher.status} />
                            </div>
                        </div>

                        <Rows
                            items={[
                                ["Name", voucher.name],
                                ["Sub title", voucher.subtitle],
                                ["Short title", voucher.shortTitle],
                                ["Valid from", formatDate(voucher.createdDate)],
                                ["Valid until", formatDate(voucher.expiredDate)],
                            ]}
                        />

                        <div className="card">
                            <div className="card-title">Can be used on</div>

                            {voucher.rules.length === 0 && <p className="muted small">Any day and time.</p>}

                            {voucher.rules.map((rule, index) => (
                                <div key={index} className="row" style={{ padding: "8px 0" }}>
                                    <span>{rule.dayOfWeek}</span>
                                    <span className="row-value">
                                        {rule.startTime} - {rule.endTime}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {voucher.description && (
                            <div className="card">
                                <div className="card-title">Description</div>
                                <p className="pre">{voucher.description}</p>
                            </div>
                        )}

                        {voucher.tnC && (
                            <div className="card">
                                <div className="card-title">Terms and conditions</div>
                                <p className="pre muted small">{voucher.tnC}</p>
                            </div>
                        )}

                        <div className="actions">
                            <Link className="btn" to={A.editVoucher(voucher.id)}>
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
