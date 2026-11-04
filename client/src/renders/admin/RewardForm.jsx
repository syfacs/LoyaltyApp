import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "../../constants.js";
import Field from "../../components/Field.jsx";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Thumb from "../../components/Thumb.jsx";
import { useToast } from "../../context/ToastContext.js";
import useLoad from "../../services/useLoad.js";
import { adminApi } from "../../services/api.js";
import { dateInput, toDateInput } from "../../utils/format.js";
import { checkDates, checkImage, checkRequired, onlyErrors } from "../../utils/validators.js";
import useForm from "../../utils/useForm.js";

const A = ROUTES.admin;

// create a reward (/admin/rewards/new) or edit one (/admin/rewards/5/edit)
export default function RewardForm() {
    const { id } = useParams();

    const { data, loading, error, reload } = useLoad(() => (id ? adminApi.reward(id) : Promise.resolve(null)), [id]);

    return (
        <>
            <PageHeader title={id ? "Edit reward" : "New reward"} back={id ? A.reward(id) : A.rewards} />

            <div className="content">
                <Status loading={loading} error={error} onRetry={reload} />

                {!loading && !error && <Fields key={id} reward={data?.reward} />}
            </div>
        </>
    );
}

function Fields({ reward }) {
    const navigate = useNavigate();
    const toast = useToast();

    const today = dateInput();
    const nextYear = dateInput(365);

    const form = useForm({
        name: reward?.name ?? "",
        title: reward?.title ?? "",
        subTitle: reward?.subTitle ?? "",
        shortTitle: reward?.shortTitle ?? "",
        point: reward?.point ?? "",
        description: reward?.description ?? "",
        tnC: reward?.tnC ?? "",
        createDate: toDateInput(reward?.createDate) || today,
        expireDate: toDateInput(reward?.expireDate) || nextYear,
        image: null,
    });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        const v = form.values;

        const pointNumber = Number(v.point);

        const found = onlyErrors({
            name: checkRequired(v.name, "Name"),
            point: v.point !== "" && Number.isInteger(pointNumber) && pointNumber >= 0 ? "" : "Enter the points needed (0 or more).",
            dates: checkDates(v.createDate, v.expireDate),
            image: checkImage(v.image),
        });
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setBusy(true);

        try {
            const response = reward
                ? await adminApi.editReward({ id: reward.id, ...v })
                : await adminApi.createReward(v);

            toast.success(response.message);
            navigate(reward ? A.reward(reward.id) : A.rewards, { replace: true });
        } catch (err) {
            if (!err.sessionExpired) toast.error(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <form className="auth-card" onSubmit={handleSubmit} noValidate>
            <Field label="Name" error={errors.name} {...form.bind("name")} />
            <Field label="Title (shown to members)" hint="Leave empty to use the name." {...form.bind("title")} />
            <Field label="Sub title" {...form.bind("subTitle")} />
            <Field label="Short title" {...form.bind("shortTitle")} />
            <Field label="Points needed" type="number" min="0" inputMode="numeric" error={errors.point} {...form.bind("point")} />
            <Field label="Description" as="textarea" {...form.bind("description")} />
            <Field label="Terms and conditions" as="textarea" {...form.bind("tnC")} />

            <div className="grid-2">
                <Field label="Valid from" type="date" {...form.bind("createDate")} />
                <Field label="Valid until" type="date" {...form.bind("expireDate")} />
            </div>
            {errors.dates && <span className="field-error" style={{ marginTop: -8, marginBottom: 12 }}>{errors.dates}</span>}

            {reward?.imageUrl && (
                <div style={{ marginBottom: 12 }}>
                    <span className="field-label">Current image</span>
                    <Thumb src={reward.imageUrl} alt={reward.name} />
                </div>
            )}

            <Field
                label={reward ? "Replace image (optional)" : "Image (optional)"}
                type="file"
                accept="image/*"
                error={errors.image}
                onChange={(event) => form.set("image", event.target.files[0] ?? null)}
            />

            <button type="submit" className="btn btn-block" disabled={busy}>
                {busy ? "Please wait..." : reward ? "Save changes" : "Create reward"}
            </button>
        </form>
    );
}
