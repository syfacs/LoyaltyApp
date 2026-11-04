import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { APP_NAME, ROUTES } from "../../constants.js";
import { PasswordField, PhoneField } from "../../components/Field.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.js";
import { useToast } from "../../context/ToastContext.js";
import { memberApi } from "../../services/api.js";
import { checkPhone, checkRequired, fullPhone, onlyErrors } from "../../utils/validators.js";
import useForm from "../../utils/useForm.js";

const R = ROUTES.member;

export default function Login() {
    const { user, setUser } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    const form = useForm({ phoneNumber: "", password: "" });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    // where to go after logging in: the page the user wanted, or home
    const destination = location.state?.from ?? R.home;

    if (user) return <Navigate to={destination} replace />;

    async function handleSubmit(event) {
        event.preventDefault();

        const found = onlyErrors({
            phoneNumber: checkPhone(form.values.phoneNumber),
            password: checkRequired(form.values.password, "Password"),
        });
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setBusy(true);

        try {
            const response = await memberApi.login(fullPhone(form.values.phoneNumber), form.values.password);

            setUser(response.member);
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
            <PageHeader title="Log in" back={R.home} />

            <div className="content">
                <form className="auth-card" onSubmit={handleSubmit} noValidate>
                    <h2 style={{ marginBottom: 4 }}>Welcome to {APP_NAME}</h2>
                    <p className="muted small" style={{ marginBottom: 18 }}>
                        Log in with your phone number and password.
                    </p>

                    <PhoneField placeholder="123456789" error={errors.phoneNumber} {...form.bind("phoneNumber")} />

                    <PasswordField
                        label="Password"
                        autoComplete="current-password"
                        error={errors.password}
                        {...form.bind("password")}
                    />

                    <button type="submit" className="btn btn-block" disabled={busy}>
                        {busy ? "Please wait..." : "Log in"}
                    </button>

                    <div className="auth-links">
                        <Link to={R.forgotPassword}>Forgot password?</Link>
                        <Link to={R.register}>Create an account</Link>
                    </div>
                </form>
            </div>
        </>
    );
}
