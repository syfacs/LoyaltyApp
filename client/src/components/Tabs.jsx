import { NavLink } from "react-router-dom";

// tabs that change a value on the same page: options = [{ value, label }]
export function Tabs({ options, value, onChange }) {
    return (
        <div className="tabs">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    className={option.value === value ? "tab active" : "tab"}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

// tabs that open another page: options = [{ to, label }]
export function LinkTabs({ options }) {
    return (
        <div className="tabs">
            {options.map((option) => (
                <NavLink key={option.to} to={option.to} end className={({ isActive }) => (isActive ? "tab active" : "tab")}>
                    {option.label}
                </NavLink>
            ))}
        </div>
    );
}
