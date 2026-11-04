import { createContext, useContext } from "react";

// Who is logged in, for the portal (member or admin) the page belongs to.
// user is null when nobody is logged in.
export const AuthContext = createContext(null);

export function useAuth() {
    return useContext(AuthContext);
}
