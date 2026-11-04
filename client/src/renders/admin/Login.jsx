import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ADMIN_NAME, ROUTES } from "../../constants.js";
import Field, { PasswordField } from "../../components/Field.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.js";
import { useToast } from "../../context/ToastContext.js";
import { adminApi } from "../../services/api.js";
import { checkRequired, onlyErrors } from "../../utils/validators.js";
import useForm from "../../utils/useForm.js";

export default function AdminLogin() {
    const { user, setUser } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    const form = useForm({ username: "", password: "" });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    const destination = location.state?.from ?? ROUTES.admin.home;

    // already logged in
    if (user) return <Navigate to={destination} replace />;

    async function handleSubmit(event) {
        event.preventDefault();

        const found = onlyErrors({
            username: checkRequired(form.values.username, "Username"),
            password: checkRequired(form.values.password, "Password"),
        });
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setBusy(true);

        try {
            const response = await adminApi.login(form.values.username, form.values.password);

            setUser({ username: response.username });
            toast.success(response.message);
            navigate(destination, { replace: true });
        } catch (error) {
            toast.error(error.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <PageHeader title={ADMIN_NAME} back={false} />

            <div className="content">
                <form className="auth-card" onSubmit={handleSubmit} noValidate>
                    <h2 style={{ marginBottom: 4 }}>Admin log in</h2>
                    <p className="muted small" style={{ marginBottom: 18 }}>
                        For head office staff only.
                    </p>

                    <Field label="Username" autoComplete="username" error={errors.username} {...form.bind("username")} />

                    <PasswordField
                        label="Password"
                        autoComplete="current-password"
                        error={errors.password}
                        {...form.bind("password")}
                    />

                    <button type="submit" className="btn btn-block" disabled={busy}>
                        {busy ? "Please wait..." : "Log in"}
                    </button>
                </form>
            </div>
        </>
    );
}
