import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { Loader } from "./Loader.jsx";

// Wraps the pages that need a login. Anyone who is not logged in is sent to loginPath,
// and brought back to the page they wanted after logging in.
export default function RequireAuth({ loginPath }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <Loader full />;

    if (!user) return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;

    return <Outlet />;
}
