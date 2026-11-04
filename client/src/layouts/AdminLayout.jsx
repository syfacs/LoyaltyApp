import { NavLink, Outlet } from "react-router-dom";
import { ADMIN_MENU, ADMIN_NAME, ROUTES } from "../constants.js";
import Icon from "../components/Icon.jsx";
import { useAuth } from "../context/AuthContext.js";

// The admin pages. On a phone it is the same single column as the rest of the app.
// On a computer (wide screen) a side menu shows up and the pages get more room (see "admin shell" in index.css).
export default function AdminLayout() {
    const { user, logout } = useAuth();

    return (
        <div className="admin-shell">
            <aside className="admin-side">
                <div className="admin-brand">{ADMIN_NAME}</div>

                <nav>
                    <NavLink to={ROUTES.admin.home} end className="side-link">
                        <Icon name="home" size={20} />
                        Dashboard
                    </NavLink>

                    {ADMIN_MENU.map((item) => (
                        <NavLink key={item.to} to={item.to} className="side-link">
                            <Icon name={item.icon} size={20} />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="side-user">
                    <span className="muted small">Signed in as</span>
                    <b>{user?.username}</b>

                    <button type="button" className="btn btn-outline" onClick={logout}>
                        <Icon name="logout" size={18} /> Log out
                    </button>
                </div>
            </aside>

            <main className="admin-main">
                <div className="screen">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
