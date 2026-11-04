import { useState } from "react";
import { PHONE_PREFIX } from "../constants.js";

// A label, an input and an error message.
// Use as="select" or as="textarea" for other kinds of fields (a select takes <option>s as children).
export default function Field({ label, error, hint, as: Tag = "input", children, ...props }) {
    return (
        <label className="field">
            {label && <span className="field-label">{label}</span>}
            <Tag className="input" {...props}>
                {children}
            </Tag>
            {hint && <span className="field-hint">{hint}</span>}
            {error && <span className="field-error">{error}</span>}
        </label>
    );
}

// a password field with a Show / Hide button
export function PasswordField({ label, error, ...props }) {
    const [shown, setShown] = useState(false);

    return (
        <label className="field">
            <span className="field-label">{label}</span>
            <span className="password-wrap">
                <input className="input" type={shown ? "text" : "password"} {...props} />
                <button type="button" className="password-toggle" onClick={() => setShown(!shown)}>
                    {shown ? "Hide" : "Show"}
                </button>
            </span>
            {error && <span className="field-error">{error}</span>}
        </label>
    );
}

// a phone number field that shows the country code in front
export function PhoneField({ label = "Phone number", error, ...props }) {
    return (
        <label className="field">
            <span className="field-label">{label}</span>
            <span className="phone-wrap">
                <span className="phone-prefix">{PHONE_PREFIX}</span>
                <input className="input" type="tel" inputMode="numeric" autoComplete="tel" {...props} />
            </span>
            {error && <span className="field-error">{error}</span>}
        </label>
    );
}
