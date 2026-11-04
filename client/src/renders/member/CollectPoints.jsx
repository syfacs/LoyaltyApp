import { useState } from "react";
import { MAX_POINTS_PER_CLAIM, POINTS_LABEL, ROUTES, STAFF_PIN_LENGTH } from "../../constants.js";
import Field from "../../components/Field.jsx";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.js";
import { useToast } from "../../context/ToastContext.js";
import useLoad from "../../services/useLoad.js";
import { memberApi } from "../../services/api.js";
import { formatPoints } from "../../utils/format.js";
import { checkPin, checkRequired, onlyErrors } from "../../utils/validators.js";
import useForm from "../../utils/useForm.js";

export default function CollectPoints() {
    const toast = useToast();
    const { user, setPoints } = useAuth();

    const outlets = useLoad(() => memberApi.outlets(), []);

    const form = useForm({ point: "", outletGuid: "", pin: "" });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState("");

    function checkPoint(value) {
        const number = Number(value);

        if (!Number.isInteger(number) || number < 1 || number > MAX_POINTS_PER_CLAIM) {
            return `Enter a whole number from 1 to ${MAX_POINTS_PER_CLAIM}.`;
        }

        return "";
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const v = form.values;

        const found = onlyErrors({
            point: checkPoint(v.point),
            outletGuid: checkRequired(v.outletGuid, "Outlet"),
            pin: checkPin(v.pin),
        });
        setErrors(found);
        setResult("");
        if (Object.keys(found).length > 0) return;

        setBusy(true);

        try {
            const response = await memberApi.collectPoints({ point: Number(v.point), outletGuid: v.outletGuid, pin: v.pin });

            toast.success("Points added!");
            setResult(response.message);
            if (response.points !== null && response.points !== undefined) setPoints(response.points);

            form.setValues({ point: "", outletGuid: v.outletGuid, pin: "" });
        } catch (error) {
            if (!error.sessionExpired) toast.error(error.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <PageHeader title="Collect points" back={ROUTES.member.account} />

            <div className="content">
                <div className="card center">
                    <div className="muted small">Your points</div>
                    <div className="points-number">
                        {formatPoints(user?.point)}
                        <small>{POINTS_LABEL}</small>
                    </div>
                </div>

                <Status loading={outlets.loading} error={outlets.error} onRetry={outlets.reload} />

                {outlets.data && (
                    <form className="auth-card" onSubmit={handleSubmit} noValidate>
                        <p className="muted small" style={{ marginBottom: 14 }}>
                            Tell us how many points you earned. The outlet staff confirms them with their PIN.
                        </p>

                        {result && <div className="alert alert-success">{result}</div>}

                        <Field
                            label="Points earned"
                            type="number"
                            inputMode="numeric"
                            min="1"
                            error={errors.point}
                            {...form.bind("point")}
                        />

                        <Field label="Outlet" as="select" error={errors.outletGuid} {...form.bind("outletGuid")}>
                            <option value="">Choose an outlet</option>
                            {outlets.data.outlets.map((outlet) => (
                                <option key={outlet.guid} value={outlet.guid}>
                                    {outlet.name}
                                </option>
                            ))}
                        </Field>

                        <Field
                            label="Staff PIN"
                            type="password"
                            inputMode="numeric"
                            maxLength={STAFF_PIN_LENGTH}
                            autoComplete="off"
                            error={errors.pin}
                            {...form.bind("pin")}
                        />

                        <button type="submit" className="btn btn-block" disabled={busy}>
                            {busy ? "Please wait..." : "Collect points"}
                        </button>
                    </form>
                )}
            </div>
        </>
    );
}
