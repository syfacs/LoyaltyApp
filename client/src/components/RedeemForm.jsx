import { useState } from "react";
import { STAFF_PIN_LENGTH } from "../constants.js";
import { checkPin, checkRequired, onlyErrors } from "../utils/validators.js";
import useForm from "../utils/useForm.js";
import Field, { PasswordField } from "./Field.jsx";

// Asks for the member password and the staff PIN, used to redeem a reward or a voucher at the outlet.
// onSubmit gets { memberPassword, outletStaffPin } and gives back a promise of true (worked) or false (failed).
export default function RedeemForm({ buttonLabel, onSubmit }) {
    const form = useForm({ memberPassword: "", outletStaffPin: "" });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        const found = onlyErrors({
            memberPassword: checkRequired(form.values.memberPassword, "Password"),
            outletStaffPin: checkPin(form.values.outletStaffPin),
        });
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setBusy(true);

        const worked = await onSubmit(form.values);

        if (worked) form.setValues({ memberPassword: "", outletStaffPin: "" });

        setBusy(false);
    }

    return (
        <form className="card" onSubmit={handleSubmit} noValidate>
            <div className="card-title">Confirm at the outlet</div>
            <p className="muted small" style={{ marginBottom: 12 }}>
                Enter your password, then ask the outlet staff to enter their PIN.
            </p>

            <PasswordField
                label="Your password"
                autoComplete="current-password"
                error={errors.memberPassword}
                {...form.bind("memberPassword")}
            />

            <Field
                label="Staff PIN"
                type="password"
                inputMode="numeric"
                maxLength={STAFF_PIN_LENGTH}
                autoComplete="off"
                error={errors.outletStaffPin}
                {...form.bind("outletStaffPin")}
            />

            <button type="submit" className="btn btn-block" disabled={busy}>
                {busy ? "Please wait..." : buttonLabel}
            </button>
        </form>
    );
}
