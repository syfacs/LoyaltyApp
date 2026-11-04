// A simple bar chart made with plain CSS. data = [{ label: "Pending", value: 4 }, ...]
export default function BarChart({ title, data }) {
    const max = Math.max(...data.map((item) => item.value), 1);

    return (
        <div className="card">
            <div className="card-title">{title}</div>

            <div className="bars">
                {data.map((item) => (
                    <div key={item.label} className="bar">
                        <span className="bar-value">{item.value}</span>
                        <div className="bar-fill" style={{ height: `${(item.value / max) * 100}%` }} />
                        <span className="bar-label">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
