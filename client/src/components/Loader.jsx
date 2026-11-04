export function Loader({ full = false }) {
    return (
        <div className={full ? "loader full" : "loader"}>
            <div className="spinner" />
        </div>
    );
}

// Put <Status loading={loading} error={error} onRetry={reload} /> on a page that loads data.
// It shows the spinner while loading, the error message if it failed, and nothing when all is fine.
export function Status({ loading, error, onRetry }) {
    if (loading) return <Loader />;

    if (error) {
        return (
            <div className="alert alert-error">
                {error}{" "}
                {onRetry && (
                    <button type="button" className="link-btn" onClick={onRetry}>
                        Try again
                    </button>
                )}
            </div>
        );
    }

    return null;
}
