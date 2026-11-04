import { useEffect, useState } from "react";
import { adminApi, memberApi, onSessionExpired } from "../services/api.js";
import { AuthContext } from "./AuthContext.js";

// Asks the server "am I still logged in?" when the portal opens and keeps the answer.
// The tokens stay on the server (in the session), here we only know the user.
export default function AuthProvider({ portal, children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const request = portal === "admin" ? adminApi.session() : memberApi.profile();

        request
            .then((response) => setUser(portal === "admin" ? { username: response.username } : response.member))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, [portal]);

    // when the server says the session ended, forget the user so the login page is shown
    useEffect(() => {
        return onSessionExpired((expiredPortal) => {
            if (expiredPortal === portal) setUser(null);
        });
    }, [portal]);

    async function logout() {
        try {
            await (portal === "admin" ? adminApi.logout() : memberApi.logout());
        } finally {
            setUser(null);
        }
    }

    function setPoints(point) {
        setUser((current) => (current ? { ...current, point } : current));
    }

    // loads the member again, for example to show the newest points
    async function refresh() {
        try {
            const response = await memberApi.profile();
            setUser(response.member);
        } catch {
            // nothing to do: an expired session is handled by the listener above
        }
    }

    return (
        <AuthContext.Provider value={{ user, setUser, setPoints, refresh, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
