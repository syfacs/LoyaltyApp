import { Link } from "react-router-dom";
import { APP_NAME, APP_TAGLINE, POINTS_LABEL, ROUTES } from "../../constants.js";
import Carousel from "../../components/Carousel.jsx";
import { Status } from "../../components/Loader.jsx";
import Icon from "../../components/Icon.jsx";
import RewardCard from "../../components/RewardCard.jsx";
import Thumb from "../../components/Thumb.jsx";
import useLoad from "../../services/useLoad.js";
import { memberApi } from "../../services/api.js";
import { formatPoints, greeting } from "../../utils/format.js";

const R = ROUTES.member;

const QUICK_LINKS = [
    { label: "Collect", icon: "plus", to: R.collectPoints },
    { label: "Vouchers", icon: "ticket", to: R.myVouchers },
    { label: "History", icon: "clock", to: R.history },
    { label: "Feedback", icon: "message", to: R.feedback },
];

export default function Home() {
    const { data, loading, error, reload } = useLoad(() => memberApi.home(), []);

    const member = data?.member;

    return (
        <>
            <div className="hero">
                <div className="hero-top">
                    <div className="brand">
                        {APP_NAME}
                        <small>{APP_TAGLINE}</small>
                    </div>

                    <Link className="icon-btn" to={member ? R.account : R.login} aria-label="Account">
                        <Icon name="user" />
                    </Link>
                </div>

                <p style={{ marginTop: 18, fontSize: "1.15rem", fontWeight: 700 }}>
                    {greeting()}
                    {member ? `, ${member.name}` : "!"}
                </p>
            </div>

            <div className="points-card">
                {member ? (
                    <>
                        <div className="muted small">Your points</div>
                        <div className="points-number">
                            {formatPoints(member.point)}
                            <small>{POINTS_LABEL}</small>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="points-number">
                            0<small>{POINTS_LABEL}</small>
                        </div>
                        <p className="muted small" style={{ margin: "6px 0 12px" }}>
                            Log in or register to collect points and redeem rewards.
                        </p>
                        <div className="actions" style={{ marginTop: 0 }}>
                            <Link className="btn" to={R.login}>
                                Log in
                            </Link>
                            <Link className="btn btn-outline" to={R.register}>
                                Register
                            </Link>
                        </div>
                    </>
                )}

                <div className="quick">
                    {QUICK_LINKS.map((link) => (
                        <Link key={link.label} to={link.to}>
                            <span className="quick-icon">
                                <Icon name={link.icon} />
                            </span>
                            {link.label}
                        </Link>
                    ))}
                </div>
            </div>

            <div className="content flat">
                <Status loading={loading} error={error} onRetry={reload} />

                {data && (
                    <>
                        <div className="section-title">Highlights</div>

                        {data.highlights.length === 0 && <div className="empty">No promotions right now.</div>}

                        <Carousel>
                            {data.highlights.map((highlight) => (
                                <Link key={highlight.guid} className="promo" to={R.highlight(highlight.guid)}>
                                    <Thumb src={highlight.imageUrl} alt={highlight.title} />
                                    <div className="promo-body">
                                        <div className="promo-title">{highlight.title}</div>
                                        <div className="muted small">{highlight.subTitle}</div>
                                    </div>
                                </Link>
                            ))}
                        </Carousel>

                        <div className="section-title">
                            Membership rewards
                            <Link to={R.rewards}>View all</Link>
                        </div>

                        {data.rewards.length === 0 && <div className="empty">No rewards available yet.</div>}

                        <Carousel>
                            {data.rewards.map((reward) => (
                                <RewardCard key={reward.guid} reward={reward} />
                            ))}
                        </Carousel>
                    </>
                )}
            </div>
        </>
    );
}
