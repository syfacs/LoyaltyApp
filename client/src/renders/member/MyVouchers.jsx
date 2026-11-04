import { ROUTES } from "../../constants.js";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import VoucherItem from "../../components/VoucherItem.jsx";
import useLoad from "../../services/useLoad.js";
import { memberApi } from "../../services/api.js";

// the vouchers the member has not used yet
export default function MyVouchers() {
    const { data, loading, error, reload } = useLoad(() => memberApi.myVouchers(), []);

    return (
        <>
            <PageHeader title="My vouchers" back={ROUTES.member.account} />

            <div className="content">
                <Status loading={loading} error={error} onRetry={reload} />

                {data && data.vouchers.length === 0 && <div className="empty">You have no unused vouchers.</div>}

                {data?.vouchers.map((voucher) => (
                    <VoucherItem key={voucher.guid} voucher={voucher} />
                ))}
            </div>
        </>
    );
}
