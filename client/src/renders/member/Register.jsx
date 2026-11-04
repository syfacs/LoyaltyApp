import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants.js";
import Field, { PasswordField, PhoneField } from "../../components/Field.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { useToast } from "../../context/ToastContext.js";
import { memberApi } from "../../services/api.js";
import {
    checkEmail,
    checkImage,
    checkMatch,
    checkPassword,
    checkPhone,
    checkRequired,
    fullPhone,
    onlyErrors,
} from "../../utils/validators.js";
import useForm from "../../utils/useForm.js";
import { dateInput } from "../../utils/format.js";

const R = ROUTES.member;

export default function Register() {
    const toast = useToast();
    const navigate = useNavigate();

    const form = useForm({
        name: "",
        phoneNumber: "",
        email: "",
        birthday: "",
        referralBy: "",
        password: "",
        confirmPassword: "",
        image: null,
    });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    const today = dateInput();

    async function handleSubmit(event) {
        event.preventDefault();

        const v = form.values;

        const found = onlyErrors({
            name: checkRequired(v.name, "Name"),
            phoneNumber: checkPhone(v.phoneNumber),
            email: checkEmail(v.email),
            password: checkPassword(v.password),
            confirmPassword: checkMatch(v.confirmPassword, v.password),
            image: checkImage(v.image),
        });
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setBusy(true);

        try {
            const response = await memberApi.register({ ...v, phoneNumber: fullPhone(v.phoneNumber) });

            toast.success(response.message);

            // the server emailed a code, the member enters it on the next page
            navigate(R.verify, {
                state: { purpose: "register", email: response.email, debugOtp: response.debugOtp },
            });
        } catch (error) {
            toast.error(error.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <PageHeader title="Register" back={R.login} />

            <div className="content">
                <form className="auth-card" onSubmit={handleSubmit} noValidate>
                    <Field label="Full name" autoComplete="name" error={errors.name} {...form.bind("name")} />

                    <PhoneField placeholder="123456789" error={errors.phoneNumber} {...form.bind("phoneNumber")} />

                    <Field
                        label="Email"
                        type="email"
                        autoComplete="email"
                        hint="We send a verification code to this email."
                        error={errors.email}
                        {...form.bind("email")}
                    />

                    <Field label="Birthday (optional)" type="date" max={today} {...form.bind("birthday")} />

                    <PasswordField
                        label="Password"
                        autoComplete="new-password"
                        error={errors.password}
                        {...form.bind("password")}
                    />

                    <PasswordField
                        label="Confirm password"
                        autoComplete="new-password"
                        error={errors.confirmPassword}
                        {...form.bind("confirmPassword")}
                    />

                    <Field label="Referral code (optional)" maxLength={5} {...form.bind("referralBy")} />

                    <Field
                        label="Profile photo (optional)"
                        type="file"
                        accept="image/*"
                        error={errors.image}
                        onChange={(event) => form.set("image", event.target.files[0] ?? null)}
                    />

                    <button type="submit" className="btn btn-block" disabled={busy}>
                        {busy ? "Please wait..." : "Create account"}
                    </button>

                    <div className="auth-links">
                        <span className="muted">Already a member?</span>
                        <Link to={R.login}>Log in</Link>
                    </div>
                </form>
            </div>
        </>
    );
}
