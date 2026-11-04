import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { POINTS_LABEL, ROUTES } from "../../constants.js";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Rows from "../../components/Rows.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { useToast } from "../../context/ToastContext.js";
import useLoad from "../../services/useLoad.js";
import { adminApi } from "../../services/api.js";
import { formatDate, formatDateTime } from "../../utils/format.js";

const A = ROUTES.admin;

export default function MemberDetail() {
    const { id } = useParams();
    const toast = useToast();

    const { data, loading, error, reload } = useLoad(() => adminApi.member(id), [id]);
    const [busy, setBusy] = useState(false);

    const member = data?.member;

    async function handleToggle() {
        const action = member.status === "Active" ? "deactivate" : "activate";
        if (!window.confirm(`Do you want to ${action} ${member.name}?`)) return;

        setBusy(true);

        try {
            const response = await adminApi.toggleMember(id);

            toast.success(response.message);
            reload();
        } catch (err) {
            if (!err.sessionExpired) toast.error(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <PageHeader title="Member" back={A.members} />

            <div className="content">
                <Status loading={loading} error={error} onRetry={reload} />

                {member && (
                    <>
                        <div className="card center">
                            {member.imageUrl ? (
                                <img className="avatar" style={{ margin: "0 auto 8px", width: 84, height: 84 }} src={member.imageUrl} alt="" />
                            ) : (
                                <span className="avatar" style={{ margin: "0 auto 8px", width: 84, height: 84 }}>
                                    {member.name?.[0]?.toUpperCase()}
                                </span>
                            )}

                            <h2>{member.name}</h2>
                            <StatusBadge status={member.status} />
                        </div>

                        <Rows
                            items={[
                                ["Member id", member.id],
                                ["Email", member.email],
                                ["Phone", member.phoneNumber],
                                ["Birthday", member.birthDate ? formatDate(member.birthDate) : ""],
                                ["Points", `${member.point} ${POINTS_LABEL}`],
                                ["Tier", member.tier],
                                ["Referral code", member.referralCode],
                                ["Registered", formatDateTime(member.registerTime)],
                            ]}
                        />

                        <div className="actions">
                            <Link className="btn" to={A.editMember(member.id)}>
                                Edit
                            </Link>

                            <button type="button" className="btn btn-outline" onClick={handleToggle} disabled={busy}>
                                {member.status === "Active" ? "Deactivate" : "Activate"}
                            </button>
                        </div>

                        <div className="actions">
                            <Link className="btn btn-accent" to={`${A.assignPoints}?phone=${encodeURIComponent(member.phoneNumber ?? "")}`}>
                                Add points
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
