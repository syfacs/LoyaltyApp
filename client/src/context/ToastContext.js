import { createContext, useContext } from "react";

// toast.success("Saved") and toast.error("Something went wrong") show a short message at the top
export const ToastContext = createContext({ success: () => {}, error: () => {} });

export function useToast() {
    return useContext(ToastContext);
}
