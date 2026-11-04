import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants.js";
import { PhoneField } from "../../components/Field.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { useToast } from "../../context/ToastContext.js";
import { memberApi } from "../../services/api.js";
import { checkPhone, fullPhone } from "../../utils/validators.js";
import useForm from "../../utils/useForm.js";

const R = ROUTES.member;

export default function ForgotPassword() {
    const toast = useToast();
    const navigate = useNavigate();

    const form = useForm({ phoneNumber: "" });
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        const found = checkPhone(form.values.phoneNumber);
        setError(found);
        if (found) return;

        setBusy(true);

        try {
            const response = await memberApi.forgotPassword(fullPhone(form.values.phoneNumber));

            toast.success(response.message);
            navigate(R.verify, { state: { purpose: "reset", email: response.email, debugOtp: response.debugOtp } });
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <PageHeader title="Forgot password" back={R.login} />

            <div className="content">
                <form className="auth-card" onSubmit={handleSubmit} noValidate>
                    <p className="muted" style={{ marginBottom: 16 }}>
                        Enter your phone number. We will email a verification code to the address on your account.
                    </p>

                    <PhoneField placeholder="123456789" error={error} {...form.bind("phoneNumber")} />

                    <button type="submit" className="btn btn-block" disabled={busy}>
                        {busy ? "Please wait..." : "Send code"}
                    </button>
                </form>
            </div>
        </>
    );
}
