import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ADMIN_MENU, ADMIN_NAME, ROUTES } from "../../constants.js";
import BarChart from "../../components/BarChart.jsx";
import Icon from "../../components/Icon.jsx";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SearchBox from "../../components/SearchBox.jsx";
import { useAuth } from "../../context/AuthContext.js";
import useLoad from "../../services/useLoad.js";
import { adminApi } from "../../services/api.js";

const A = ROUTES.admin;

export default function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const { data, loading, error, reload } = useLoad(() => adminApi.dashboard(), []);
    const [search, setSearch] = useState("");

    // the search looks for members (name, email, phone or id)
    function handleSearch(event) {
        event.preventDefault();

        navigate(`${A.members}?search=${encodeURIComponent(search.trim())}`);
    }

    return (
        <>
            <PageHeader
                title={ADMIN_NAME}
                back={false}
                right={
                    <button type="button" className="header-action" onClick={logout}>
                        Log out
                    </button>
                }
            />

            <div className="content">
                <p className="muted" style={{ marginBottom: 12 }}>
                    Signed in as <b>{user.username}</b>
                </p>

                <form onSubmit={handleSearch}>
                    <SearchBox value={search} onChange={setSearch} placeholder="Find a member (name, email, phone, id)" />
                </form>

                <Status loading={loading} error={error} onRetry={reload} />

                {data && (
                    <>
                        <div className="stats">
                            <Link className="stat" to={A.members} style={{ textDecoration: "none" }}>
                                <div className="stat-value">{data.totalMembers}</div>
                                <div className="stat-label">Members ({data.activeMembers} active)</div>
                            </Link>

                            <Link className="stat" to={A.rewards} style={{ textDecoration: "none" }}>
                                <div className="stat-value">{data.activeRewards}</div>
                                <div className="stat-label">Active rewards</div>
                            </Link>

                            <Link className="stat" to={A.vouchers} style={{ textDecoration: "none" }}>
                                <div className="stat-value">{data.activeVouchers}</div>
                                <div className="stat-label">Active vouchers</div>
                            </Link>

                            <Link className="stat" to={A.points} style={{ textDecoration: "none" }}>
                                <div className="stat-value">{data.pointRecords}</div>
                                <div className="stat-label">Point records</div>
                            </Link>
                        </div>

                        <div className="chart-grid">
                            <BarChart title="Point records by status" data={data.pointsByStatus} />
                            <BarChart title="Redemptions" data={data.redemptions} />
                        </div>
                    </>
                )}

                {/* on a computer the side menu has these links */}
                <div className="section-title phone-only">Manage</div>

                <div className="tiles phone-only">
                    {ADMIN_MENU.map((tile) => (
                        <Link key={tile.label} className="tile" to={tile.to}>
                            <Icon name={tile.icon} size={26} />
                            {tile.label}
                        </Link>
                    ))}
                </div>
            </div>
        </>
    );
}
