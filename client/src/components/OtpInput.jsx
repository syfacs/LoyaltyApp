import { useRef } from "react";
import { OTP_LENGTH } from "../constants.js";

// A row of boxes for a verification code. value is the code typed so far, for example "483".
export default function OtpInput({ value, onChange, disabled = false }) {
    const boxes = useRef([]);
    const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? "");

    function handleChange(index, event) {
        const typed = event.target.value.replace(/\D/g, "");

        if (!typed) {
            // the box was emptied
            onChange(digits.map((digit, i) => (i === index ? "" : digit)).join(""));
            return;
        }

        // typing or pasting several digits fills this box and the next ones
        const next = [...digits];
        typed.slice(0, OTP_LENGTH - index).split("").forEach((digit, i) => {
            next[index + i] = digit;
        });

        onChange(next.join(""));
        boxes.current[Math.min(index + typed.length, OTP_LENGTH - 1)]?.focus();
    }

    function handleKeyDown(index, event) {
        if (event.key === "Backspace" && !digits[index] && index > 0) {
            boxes.current[index - 1]?.focus();
        }
    }

    return (
        <div className="otp">
            {digits.map((digit, index) => (
                <input
                    key={index}
                    ref={(element) => (boxes.current[index] = element)}
                    className={digit ? "filled" : ""}
                    value={digit}
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    maxLength={OTP_LENGTH}
                    disabled={disabled}
                    aria-label={`Digit ${index + 1}`}
                    onChange={(event) => handleChange(index, event)}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    onFocus={(event) => event.target.select()}
                />
            ))}
        </div>
    );
}
