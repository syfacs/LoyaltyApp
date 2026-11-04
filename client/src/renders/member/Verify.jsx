import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { OTP_COUNTDOWN_SECONDS, OTP_LENGTH, ROUTES } from "../../constants.js";
import OtpInput from "../../components/OtpInput.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.js";
import { useToast } from "../../context/ToastContext.js";
import { memberApi } from "../../services/api.js";

const R = ROUTES.member;

// 105 seconds becomes "01:45"
function clock(totalSeconds) {
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");

    return `${minutes}:${seconds}`;
}

// Enter the code that was emailed. It is used after registering (purpose "register")
// and after "forgot password" (purpose "reset").
export default function Verify() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const toast = useToast();
    const { setUser } = useAuth();

    const purpose = state?.purpose;

    const [code, setCode] = useState("");
    const [email, setEmail] = useState(state?.email ?? "your email");
    const [debugOtp, setDebugOtp] = useState(state?.debugOtp);
    const [seconds, setSeconds] = useState(OTP_COUNTDOWN_SECONDS);
    const [busy, setBusy] = useState(false);

    // count down once per second, until it reaches 0
    useEffect(() => {
        if (seconds <= 0) return;

        const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);

        return () => clearTimeout(timer);
    }, [seconds]);

    // opened without starting from the register or forgot password page
    if (purpose !== "register" && purpose !== "reset") return <Navigate to={R.login} replace />;

    async function handleSubmit(event) {
        event.preventDefault();
        setBusy(true);

        try {
            const response = await memberApi.verifyOtp(code);

            if (purpose === "register") {
                setUser(response.member);
                toast.success(response.message);
                navigate(R.home, { replace: true });
            } else {
                navigate(R.resetPassword, { replace: true });
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setBusy(false);
        }
    }

    async function handleResend() {
        try {
            const response = await memberApi.resendOtp();

            setEmail(response.email);
            setDebugOtp(response.debugOtp);
            setCode("");
            setSeconds(OTP_COUNTDOWN_SECONDS);
            toast.success(response.message);
        } catch (error) {
            toast.error(error.message);
        }
    }

    return (
        <>
            <PageHeader title="Verification" back={purpose === "register" ? R.register : R.forgotPassword} />

            <div className="content">
                <form className="auth-card center" onSubmit={handleSubmit}>
                    <p>
                        The <b>verification code</b> has been sent to your email:
                    </p>
                    <p style={{ margin: "8px 0", color: "var(--danger)", fontWeight: 800 }}>{email}</p>

                    <OtpInput value={code} onChange={setCode} disabled={busy} />

                    {debugOtp && (
                        <div className="alert alert-info">
                            Development mode: the code is <b>{debugOtp}</b>
                        </div>
                    )}

                    <p className="muted" style={{ marginBottom: 14 }}>
                        {seconds > 0 ? `Code expires in ${clock(seconds)}` : "The code may have expired."}
                    </p>

                    <button type="submit" className="btn btn-block" disabled={busy || code.length < OTP_LENGTH}>
                        {busy ? "Please wait..." : "Continue"}
                    </button>

                    <p className="small" style={{ marginTop: 14 }}>
                        Did not receive the code?{" "}
                        <button type="button" className="link-btn" disabled={seconds > 0} onClick={handleResend}>
                            Resend
                        </button>
                    </p>
                </form>
            </div>
        </>
    );
}
