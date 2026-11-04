// Five stars to pick a rating. value is 0 to 5.
export default function Stars({ value, onChange }) {
    return (
        <div className="stars">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    className={star <= value ? "on" : ""}
                    onClick={() => onChange(star)}
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                >
                    ★
                </button>
            ))}
        </div>
    );
}
