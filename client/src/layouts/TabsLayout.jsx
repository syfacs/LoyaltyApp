import { Outlet } from "react-router-dom";
import BottomNav from "../components/BottomNav.jsx";

// the main pages of the member portal: they have the bottom navigation
export default function TabsLayout() {
    return (
        <>
            <div className="screen has-nav">
                <Outlet />
            </div>

            <BottomNav />
        </>
    );
}
