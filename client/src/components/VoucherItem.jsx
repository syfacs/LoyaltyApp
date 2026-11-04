import { Link } from "react-router-dom";
import { ROUTES } from "../constants.js";
import { formatDate } from "../utils/format.js";
import Icon from "./Icon.jsx";
import StatusBadge from "./StatusBadge.jsx";
import Thumb from "./Thumb.jsx";

// a voucher in a list. "status" is shown as a badge when it is given (for example Used or Expired).
export default function VoucherItem({ voucher, status }) {
    return (
        <Link className="list-item" to={ROUTES.member.voucher(voucher.guid)}>
            <Thumb small src={voucher.imageUrl} alt={voucher.name} />

            <div className="grow">
                <div className="title">{voucher.title ?? voucher.name}</div>
                <div className="meta">{voucher.subtitle ?? voucher.name}</div>
                <div className="meta">Valid until {formatDate(voucher.expiredDate)}</div>
            </div>

            {status ? <StatusBadge status={status} /> : <Icon name="next" size={18} />}
        </Link>
    );
}
