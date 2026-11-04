import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MEMBER_TIERS, ROUTES } from "../../constants.js";
import Field, { PasswordField, PhoneField } from "../../components/Field.jsx";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { useToast } from "../../context/ToastContext.js";
import useLoad from "../../services/useLoad.js";
import { adminApi } from "../../services/api.js";
import { dateInput, toDateInput } from "../../utils/format.js";
import { checkEmail, checkPassword, checkPhone, checkRequired, fullPhone, localPhone, onlyErrors } from "../../utils/validators.js";
import useForm from "../../utils/useForm.js";

const A = ROUTES.admin;

// create a member (/admin/members/new) or edit one (/admin/members/5/edit)
export default function MemberForm() {
    const { id } = useParams();

    const { data, loading, error, reload } = useLoad(() => (id ? adminApi.member(id) : Promise.resolve(null)), [id]);

    return (
        <>
            <PageHeader title={id ? "Edit member" : "New member"} back={id ? A.member(id) : A.members} />

            <div className="content">
                <Status loading={loading} error={error} onRetry={reload} />

                {!loading && !error && <Fields key={id} member={data?.member} />}
            </div>
        </>
    );
}

function Fields({ member }) {
    const navigate = useNavigate();
    const toast = useToast();

    const form = useForm({
        name: member?.name ?? "",
        email: member?.email ?? "",
        phoneNumber: localPhone(member?.phoneNumber),
        birthDate: toDateInput(member?.birthDate),
        tier: member?.tier ?? "",
        password: "",
    });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    const today = dateInput();

    async function handleSubmit(event) {
        event.preventDefault();

        const v = form.values;

        const found = onlyErrors({
            name: checkRequired(v.name, "Name"),
            email: checkEmail(v.email),
            phoneNumber: checkPhone(v.phoneNumber),
            // older members may have no birthday, so it is only needed when creating a member
            birthDate: member ? "" : checkRequired(v.birthDate, "Birthday"),
            password: member ? "" : checkPassword(v.password),
        });
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setBusy(true);

        try {
            const response = member
                ? await adminApi.editMember({ memberID: member.id, ...v, phoneNumber: fullPhone(v.phoneNumber) })
                : await adminApi.createMember({ memberID: 0, ...v, phoneNumber: fullPhone(v.phoneNumber) });

            toast.success(response.message);
            navigate(member ? A.member(member.id) : A.members, { replace: true });
        } catch (err) {
            if (!err.sessionExpired) toast.error(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <form className="auth-card" onSubmit={handleSubmit} noValidate>
            <Field label="Full name" error={errors.name} {...form.bind("name")} />
            <Field label="Email" type="email" error={errors.email} {...form.bind("email")} />
            <PhoneField placeholder="123456789" error={errors.phoneNumber} {...form.bind("phoneNumber")} />
            <Field label="Birthday" type="date" max={today} error={errors.birthDate} {...form.bind("birthDate")} />

            <Field label="Tier" as="select" {...form.bind("tier")}>
                <option value="">No tier</option>
                {MEMBER_TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                        {tier}
                    </option>
                ))}
            </Field>

            {!member && (
                <PasswordField
                    label="Password"
                    autoComplete="new-password"
                    error={errors.password}
                    {...form.bind("password")}
                />
            )}

            <button type="submit" className="btn btn-block" disabled={busy}>
                {busy ? "Please wait..." : member ? "Save changes" : "Create member"}
            </button>
        </form>
    );
}
