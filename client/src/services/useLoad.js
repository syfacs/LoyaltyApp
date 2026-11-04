import { useEffect, useState } from "react";

// Runs an api call when the page opens (and again when "deps" change or reload() is called).
// Gives back { data, loading, error, reload }.
export default function useLoad(loader, deps = []) {
    const [state, setState] = useState({ data: null, loading: true, error: "" });
    const [attempt, setAttempt] = useState(0);

    // the page decides when to load again (deps), so the loader itself is not a dependency
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        let cancelled = false;

        setState((current) => ({ ...current, loading: true, error: "" }));

        loader()
            .then((data) => {
                if (!cancelled) setState({ data, loading: false, error: "" });
            })
            .catch((error) => {
                // when the session expired the app sends the user to the login page, so no message is needed
                if (!cancelled) setState({ data: null, loading: false, error: error.sessionExpired ? "" : error.message });
            });

        return () => {
            cancelled = true;
        };
    }, [...deps, attempt]);

    return { ...state, reload: () => setAttempt((value) => value + 1) };
}
