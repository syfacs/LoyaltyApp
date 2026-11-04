import { useMemo, useState } from "react";
import { TOAST_SECONDS } from "../constants.js";
import { ToastContext } from "./ToastContext.js";

export default function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const toast = useMemo(() => {
        function show(type, message) {
            const id = Date.now() + Math.random();

            setToasts((current) => [...current, { id, type, message }]);
            setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), TOAST_SECONDS * 1000);
        }

        return {
            success: (message) => show("success", message),
            error: (message) => show("error", message),
        };
    }, []);

    return (
        <ToastContext.Provider value={toast}>
            {children}

            <div className="toasts" role="status">
                {toasts.map((item) => (
                    <div key={item.id} className={`toast toast-${item.type}`}>
                        {item.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
