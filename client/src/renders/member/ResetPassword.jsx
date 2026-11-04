import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants.js";
import { PasswordField } from "../../components/Field.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { useToast } from "../../context/ToastContext.js";
import { memberApi } from "../../services/api.js";
import { checkMatch, checkPassword, onlyErrors } from "../../utils/validators.js";
import useForm from "../../utils/useForm.js";

const R = ROUTES.member;

export default function ResetPassword() {
    const toast = useToast();
    const navigate = useNavigate();

    const form = useForm({ newPassword: "", confirmPassword: "" });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        const found = onlyErrors({
            newPassword: checkPassword(form.values.newPassword),
            confirmPassword: checkMatch(form.values.confirmPassword, form.values.newPassword),
        });
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setBusy(true);

        try {
            const response = await memberApi.resetPassword(form.values.newPassword, form.values.confirmPassword);

            toast.success(response.message);
            navigate(R.login, { replace: true });
        } catch (error) {
            toast.error(error.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <PageHeader title="Reset password" back={false} />

            <div className="content">
                <form className="auth-card" onSubmit={handleSubmit} noValidate>
                    <PasswordField
                        label="New password"
                        autoComplete="new-password"
                        error={errors.newPassword}
                        {...form.bind("newPassword")}
                    />

                    <PasswordField
                        label="Re-enter new password"
                        autoComplete="new-password"
                        error={errors.confirmPassword}
                        {...form.bind("confirmPassword")}
                    />

                    <button type="submit" className="btn btn-block" disabled={busy}>
                        {busy ? "Please wait..." : "Continue"}
                    </button>
                </form>
            </div>
        </>
    );
}
