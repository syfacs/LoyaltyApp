import { useState } from "react";
import { ROUTES } from "../../constants.js";
import { PasswordField } from "../../components/Field.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { useToast } from "../../context/ToastContext.js";
import { memberApi } from "../../services/api.js";
import { checkMatch, checkPassword, checkRequired, onlyErrors } from "../../utils/validators.js";
import useForm from "../../utils/useForm.js";

const EMPTY_FORM = { oldPassword: "", newPassword: "", confirmPassword: "" };

export default function ChangePassword() {
    const toast = useToast();

    const form = useForm(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        const v = form.values;

        const found = onlyErrors({
            oldPassword: checkRequired(v.oldPassword, "Current password"),
            newPassword: checkPassword(v.newPassword),
            confirmPassword: checkMatch(v.confirmPassword, v.newPassword),
        });
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setBusy(true);

        try {
            const response = await memberApi.changePassword(v);

            toast.success(response.message);
            form.setValues(EMPTY_FORM);
        } catch (error) {
            if (!error.sessionExpired) toast.error(error.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <PageHeader title="Change password" back={ROUTES.member.account} />

            <div className="content">
                <form className="auth-card" onSubmit={handleSubmit} noValidate>
                    <PasswordField
                        label="Current password"
                        autoComplete="current-password"
                        error={errors.oldPassword}
                        {...form.bind("oldPassword")}
                    />

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
                        {busy ? "Please wait..." : "Update password"}
                    </button>
                </form>
            </div>
        </>
    );
}
