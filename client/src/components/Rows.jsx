// A list of label / value lines. items = [["Name", "Alex"], ["Phone", "0123"]]
// A value can also be a React element, for example a badge.
export default function Rows({ items }) {
    return (
        <div className="rows">
            {items.map(([label, value]) => (
                <div key={label} className="row">
                    <span className="row-label">{label}</span>
                    <span className="row-value">{value === null || value === undefined || value === "" ? "-" : value}</span>
                </div>
            ))}
        </div>
    );
}
