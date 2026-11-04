import { Link, useLocation, useParams } from "react-router-dom";
import { ROUTES } from "../../constants.js";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import RedeemForm from "../../components/RedeemForm.jsx";
import Rows from "../../components/Rows.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import Thumb from "../../components/Thumb.jsx";
import { useToast } from "../../context/ToastContext.js";
import useLoad from "../../services/useLoad.js";
import { memberApi } from "../../services/api.js";
import { formatDate } from "../../utils/format.js";

const R = ROUTES.member;

// the messages shown instead of the redeem form
const STATE_MESSAGES = {
    used: { type: "info", text: "You have already used this voucher." },
    expired: { type: "warning", text: "This voucher has expired." },
    unavailable: { type: "warning", text: "This voucher cannot be used right now. Check the days and times below." },
};

export default function VoucherDetail() {
    const { guid } = useParams();
    const location = useLocation();
    const toast = useToast();

    const { data, loading, error, reload } = useLoad(() => memberApi.voucher(guid), [guid]);
    const voucher = data?.voucher;

    async function redeem(values) {
        try {
            const response = await memberApi.redeemVoucher({ itemGuid: guid, ...values });

            toast.success(response.message);
            reload();

            return true;
        } catch (err) {
            if (!err.sessionExpired) toast.error(err.message);

            return false;
        }
    }

    function renderAction() {
        if (data.state === "guest") {
            return (
                <Link className="btn btn-block" to={R.login} state={{ from: location.pathname }}>
                    Log in to redeem
                </Link>
            );
        }

        if (data.state === "active") return <RedeemForm buttonLabel="Redeem voucher" onSubmit={redeem} />;

        const message = STATE_MESSAGES[data.state];

        return <div className={`alert alert-${message.type}`}>{message.text}</div>;
    }

    return (
        <>
            <PageHeader title="Voucher" back />

            <div className="content">
                <Status loading={loading} error={error} onRetry={reload} />

                {voucher && (
                    <>
                        <div className="card">
                            <Thumb src={voucher.imageUrl} alt={voucher.name} />

                            <h2 style={{ marginTop: 14 }}>{voucher.title ?? voucher.name}</h2>
                            {voucher.subtitle && <p className="muted">{voucher.subtitle}</p>}

                            <div style={{ marginTop: 10 }}>
                                <StatusBadge status={voucher.status} />
                            </div>
                        </div>

                        <Rows
                            items={[
                                ["Voucher", voucher.name],
                                ["Valid from", formatDate(voucher.createdDate)],
                                ["Valid until", formatDate(voucher.expiredDate)],
                            ]}
                        />

                        {voucher.rules.length > 0 && (
                            <div className="card">
                                <div className="card-title">Can be used on</div>

                                {voucher.rules.map((rule, index) => (
                                    <div key={index} className="row" style={{ padding: "8px 0" }}>
                                        <span>{rule.dayOfWeek}</span>
                                        <span className="row-value">
                                            {rule.startTime} - {rule.endTime}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

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

                        {renderAction()}
                    </>
                )}
            </div>
        </>
    );
}
