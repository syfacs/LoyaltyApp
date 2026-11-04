import { Outlet } from "react-router-dom";

// pages opened from another page: no bottom navigation, only a back button in the header
export default function StackLayout() {
    return (
        <div className="screen">
            <Outlet />
        </div>
    );
}
