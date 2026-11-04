import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MAX_POINTS_PER_CLAIM, ROUTES, STAFF_PIN_LENGTH } from "../../constants.js";
import Field, { PhoneField } from "../../components/Field.jsx";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { useToast } from "../../context/ToastContext.js";
import useLoad from "../../services/useLoad.js";
import { adminApi } from "../../services/api.js";
import { checkPhone, checkPin, checkRequired, fullPhone, localPhone, onlyErrors } from "../../utils/validators.js";
import useForm from "../../utils/useForm.js";

const A = ROUTES.admin;

// adds points to a member directly, confirmed with the PIN of an outlet staff member
export default function AssignPoints() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const toast = useToast();

    const outlets = useLoad(() => adminApi.outlets(), []);

    // the phone can come from the member page, for example "+60123456789"
    const form = useForm({ phoneNumber: localPhone(params.get("phone")), point: "", outletID: "", pin: "" });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        const v = form.values;
        const points = Number(v.point);

        const found = onlyErrors({
            phoneNumber: checkPhone(v.phoneNumber),
            point: Number.isInteger(points) && points >= 1 && points <= MAX_POINTS_PER_CLAIM ? "" : `Enter a whole number from 1 to ${MAX_POINTS_PER_CLAIM}.`,
            outletID: checkRequired(v.outletID, "Outlet"),
            pin: checkPin(v.pin),
        });
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setBusy(true);

        try {
            const response = await adminApi.assignPoints({
                phoneNumber: fullPhone(v.phoneNumber),
                point: points,
                outletID: Number(v.outletID),
                pin: v.pin,
            });

            toast.success(response.message);
            navigate(A.points, { replace: true });
        } catch (err) {
            if (!err.sessionExpired) toast.error(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <PageHeader title="Add points" back={A.points} />

            <div className="content">
                <Status loading={outlets.loading} error={outlets.error} onRetry={outlets.reload} />

                {outlets.data && (
                    <form className="auth-card" onSubmit={handleSubmit} noValidate>
                        <PhoneField label="Member phone number" placeholder="123456789" error={errors.phoneNumber} {...form.bind("phoneNumber")} />
                        <Field label="Points" type="number" min="1" inputMode="numeric" error={errors.point} {...form.bind("point")} />

                        <Field label="Outlet" as="select" error={errors.outletID} {...form.bind("outletID")}>
                            <option value="">Choose an outlet</option>
                            {outlets.data.outlets.map((outlet) => (
                                <option key={outlet.id} value={outlet.id}>
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
                            {busy ? "Please wait..." : "Add points"}
                        </button>
                    </form>
                )}
            </div>
        </>
    );
}
