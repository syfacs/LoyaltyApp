import { useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";

// The coloured bar at the top of a page.
// back: a path to go to, true to go one page back, or false for no back button.
export default function PageHeader({ title, back = true, right }) {
    const navigate = useNavigate();

    function goBack() {
        if (typeof back === "string") navigate(back);
        else navigate(-1);
    }

    return (
        <header className="header">
            {back && (
                <button type="button" className="icon-btn" onClick={goBack} aria-label="Back">
                    <Icon name="back" />
                </button>
            )}

            <h1 className="header-title">{title}</h1>

            {right}
        </header>
    );
}
