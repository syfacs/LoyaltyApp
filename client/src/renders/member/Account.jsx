import { useEffect } from "react";
import { Link } from "react-router-dom";
import { POINTS_LABEL, ROUTES } from "../../constants.js";
import Icon from "../../components/Icon.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.js";
import { useToast } from "../../context/ToastContext.js";
import { formatPoints } from "../../utils/format.js";

const R = ROUTES.member;

const MENU = [
    { label: "My profile", icon: "user", to: R.profile },
    { label: "My vouchers", icon: "ticket", to: R.myVouchers },
    { label: "Collect points", icon: "plus", to: R.collectPoints },
    { label: "History", icon: "clock", to: R.history },
    { label: "Feedback", icon: "message", to: R.feedback },
    { label: "Change password", icon: "lock", to: R.changePassword },
];

export default function Account() {
    const { user, loading, logout, refresh } = useAuth();
    const toast = useToast();

    // show the newest points when the page opens (once)
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (user) refresh();
    }, []);

    async function handleLogout() {
        await logout();
        toast.success("You have been logged out.");
    }

    return (
        <>
            <PageHeader title="Account" back={false} />

            <div className="content">
                {!loading && !user && (
                    <div className="card center">
                        <p style={{ marginBottom: 14 }}>Log in or register to see your account.</p>

                        <div className="actions">
                            <Link className="btn" to={R.login} state={{ from: R.account }}>
                                Log in
                            </Link>
                            <Link className="btn btn-outline" to={R.register}>
                                Register
                            </Link>
                        </div>
                    </div>
                )}

                {user && (
                    <>
                        <div className="list-item">
                            {user.imageUrl ? (
                                <img className="avatar" src={user.imageUrl} alt="" />
                            ) : (
                                <span className="avatar">{user.name?.[0]?.toUpperCase()}</span>
                            )}

                            <div className="grow">
                                <div className="title">{user.name}</div>
                                <div className="meta">{user.phoneNumber}</div>
                                {user.tier && <span className="badge badge-info">{user.tier}</span>}
                            </div>

                            <div className="center">
                                <div className="points-number" style={{ fontSize: "1.5rem" }}>
                                    {formatPoints(user.point)}
                                </div>
                                <div className="muted small">{POINTS_LABEL}</div>
                            </div>
                        </div>

                        <div style={{ marginTop: 14 }}>
                            {MENU.map((item) => (
                                <Link key={item.label} className="list-item" to={item.to}>
                                    <span style={{ color: "var(--primary)" }}>
                                        <Icon name={item.icon} />
                                    </span>
                                    <span className="grow title">{item.label}</span>
                                    <Icon name="next" size={18} />
                                </Link>
                            ))}

                            <button type="button" className="btn btn-danger-outline btn-block" onClick={handleLogout}>
                                <Icon name="logout" size={18} />
                                Log out
                            </button>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
