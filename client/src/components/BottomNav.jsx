import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "../constants.js";
import Icon from "./Icon.jsx";

const R = ROUTES.member;

// "match" lists the paths that make the item look selected
const ITEMS = [
    { label: "About", icon: "info", to: R.about, match: [R.about] },
    { label: "Outlet", icon: "pin", to: R.outlets, match: [R.outlets] },
    { label: "Home", icon: "home", to: R.home, match: [R.home], center: true },
    { label: "Reward", icon: "gift", to: R.rewards, match: [R.rewards, R.vouchers, R.myVouchers] },
    { label: "Account", icon: "user", to: R.account, match: [R.account, R.history, R.collectPoints, R.feedback] },
];

function isActive(item, pathname) {
    if (item.to === R.home) return pathname === R.home;

    return item.match.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export default function BottomNav() {
    const { pathname } = useLocation();

    return (
        <nav className="bottom-nav">
            {ITEMS.map((item) => {
                const classes = ["nav-item", item.center ? "nav-home" : "", isActive(item, pathname) ? "active" : ""];

                return (
                    <Link key={item.label} to={item.to} className={classes.join(" ")}>
                        {item.center ? (
                            <span className="nav-circle">
                                <Icon name={item.icon} size={26} />
                            </span>
                        ) : (
                            <Icon name={item.icon} />
                        )}
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}
