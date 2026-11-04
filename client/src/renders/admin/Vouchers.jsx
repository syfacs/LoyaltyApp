import { Link } from "react-router-dom";
import { ROUTES } from "../../constants.js";
import Icon from "../../components/Icon.jsx";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import Thumb from "../../components/Thumb.jsx";
import useLoad from "../../services/useLoad.js";
import { adminApi } from "../../services/api.js";
import { formatDate } from "../../utils/format.js";

const A = ROUTES.admin;

export default function Vouchers() {
    const { data, loading, error, reload } = useLoad(() => adminApi.vouchers(), []);

    return (
        <>
            <PageHeader
                title="Vouchers"
                back={A.home}
                right={
                    <Link className="header-action" to={A.newVoucher}>
                        + New
                    </Link>
                }
            />

            <div className="content">
                <Status loading={loading} error={error} onRetry={reload} />

                {data && data.vouchers.length === 0 && <div className="empty">No vouchers yet.</div>}

                {data?.vouchers.map((voucher) => (
                    <Link key={voucher.id} className="list-item" to={A.voucher(voucher.id)}>
                        <Thumb small src={voucher.imageUrl} alt={voucher.name} />

                        <div className="grow">
                            <div className="title">{voucher.title ?? voucher.name}</div>
                            <div className="meta">{voucher.name}</div>
                            <div className="meta">Until {formatDate(voucher.expiredDate)}</div>
                        </div>

                        <StatusBadge status={voucher.status} />
                        <Icon name="next" size={18} />
                    </Link>
                ))}
            </div>
        </>
    );
}
