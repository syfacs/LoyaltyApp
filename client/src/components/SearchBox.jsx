import Icon from "./Icon.jsx";

export default function SearchBox({ value, onChange, placeholder = "Search" }) {
    return (
        <div className="search">
            <Icon name="search" size={18} />
            <input
                className="input"
                type="search"
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
            />
        </div>
    );
}
