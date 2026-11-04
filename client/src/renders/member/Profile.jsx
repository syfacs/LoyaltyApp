import { useState } from "react";
import { POINTS_LABEL, ROUTES } from "../../constants.js";
import Field from "../../components/Field.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Rows from "../../components/Rows.jsx";
import { useAuth } from "../../context/AuthContext.js";
import { useToast } from "../../context/ToastContext.js";
import { memberApi } from "../../services/api.js";
import { formatDate, formatPoints } from "../../utils/format.js";
import { checkEmail, checkImage, checkRequired, onlyErrors } from "../../utils/validators.js";
import useForm from "../../utils/useForm.js";

export default function Profile() {
    const { user, setUser } = useAuth();
    const toast = useToast();

    const form = useForm({ name: user.name ?? "", email: user.email ?? "", image: null });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        const found = onlyErrors({
            name: checkRequired(form.values.name, "Name"),
            email: checkEmail(form.values.email),
            image: checkImage(form.values.image),
        });
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setBusy(true);

        try {
            const response = await memberApi.updateProfile(form.values);

            setUser(response.member);
            form.set("image", null);
            toast.success(response.message);
        } catch (error) {
            if (!error.sessionExpired) toast.error(error.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <PageHeader title="My profile" back={ROUTES.member.account} />

            <div className="content">
                <div className="card center">
                    {user.imageUrl ? (
                        <img className="avatar" style={{ margin: "0 auto 8px", width: 84, height: 84 }} src={user.imageUrl} alt="" />
                    ) : (
                        <span className="avatar" style={{ margin: "0 auto 8px", width: 84, height: 84 }}>
                            {user.name?.[0]?.toUpperCase()}
                        </span>
                    )}

                    <div className="title">{user.name}</div>
                    <div className="points-number">
                        {formatPoints(user.point)}
                        <small>{POINTS_LABEL}</small>
                    </div>
                </div>

                <Rows
                    items={[
                        ["Phone", user.phoneNumber],
                        ["Birthday", user.birthDate ? formatDate(user.birthDate) : ""],
                        ["Referral code", user.referralCode],
                        ["Tier", user.tier],
                        ["Member since", formatDate(user.registerTime)],
                    ]}
                />

                <form className="auth-card" onSubmit={handleSubmit} noValidate>
                    <div className="card-title">Edit profile</div>

                    <Field label="Full name" error={errors.name} {...form.bind("name")} />
                    <Field label="Email" type="email" error={errors.email} {...form.bind("email")} />

                    <Field
                        label="Profile photo"
                        type="file"
                        accept="image/*"
                        error={errors.image}
                        onChange={(event) => form.set("image", event.target.files[0] ?? null)}
                    />

                    <button type="submit" className="btn btn-block" disabled={busy}>
                        {busy ? "Please wait..." : "Save changes"}
                    </button>
                </form>
            </div>
        </>
    );
}
