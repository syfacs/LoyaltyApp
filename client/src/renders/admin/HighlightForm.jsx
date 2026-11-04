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

// create a highlight (/admin/highlights/new) or edit one (/admin/highlights/5/edit)
export default function HighlightForm() {
    const { id } = useParams();

    const { data, loading, error, reload } = useLoad(() => (id ? adminApi.highlight(id) : Promise.resolve(null)), [id]);

    return (
        <>
            <PageHeader title={id ? "Edit highlight" : "New highlight"} back={id ? A.highlight(id) : A.highlights} />

            <div className="content">
                <Status loading={loading} error={error} onRetry={reload} />

                {!loading && !error && <Fields key={id} highlight={data?.highlight} />}
            </div>
        </>
    );
}

function Fields({ highlight }) {
    const navigate = useNavigate();
    const toast = useToast();

    const today = dateInput();
    const nextMonth = dateInput(30);

    const form = useForm({
        title: highlight?.title ?? "",
        subTitle: highlight?.subTitle ?? "",
        description: highlight?.description ?? "",
        tnC: highlight?.tnC ?? "",
        createDate: toDateInput(highlight?.createDate) || today,
        expireDate: toDateInput(highlight?.expireDate) || nextMonth,
        image: null,
    });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        const v = form.values;

        const found = onlyErrors({
            title: checkRequired(v.title, "Title"),
            dates: checkDates(v.createDate, v.expireDate),
            // a new highlight needs a picture
            image: !highlight && !v.image ? "Please choose an image." : checkImage(v.image),
        });
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setBusy(true);

        try {
            const response = highlight
                ? await adminApi.editHighlight({ id: highlight.id, ...v })
                : await adminApi.createHighlight(v);

            toast.success(response.message);
            navigate(highlight ? A.highlight(highlight.id) : A.highlights, { replace: true });
        } catch (err) {
            if (!err.sessionExpired) toast.error(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <form className="auth-card" onSubmit={handleSubmit} noValidate>
            <Field label="Title" error={errors.title} {...form.bind("title")} />
            <Field label="Sub title" {...form.bind("subTitle")} />
            <Field label="Details" as="textarea" {...form.bind("description")} />
            <Field label="Terms and conditions" as="textarea" {...form.bind("tnC")} />

            <div className="grid-2">
                <Field label="Shown from" type="date" {...form.bind("createDate")} />
                <Field label="Shown until" type="date" {...form.bind("expireDate")} />
            </div>
            {errors.dates && <span className="field-error" style={{ marginTop: -8, marginBottom: 12 }}>{errors.dates}</span>}

            {highlight?.imageUrl && (
                <div style={{ marginBottom: 12 }}>
                    <span className="field-label">Current image</span>
                    <Thumb src={highlight.imageUrl} alt={highlight.title} />
                </div>
            )}

            <Field
                label={highlight ? "Replace image (optional)" : "Image"}
                type="file"
                accept="image/*"
                error={errors.image}
                onChange={(event) => form.set("image", event.target.files[0] ?? null)}
            />

            <button type="submit" className="btn btn-block" disabled={busy}>
                {busy ? "Please wait..." : highlight ? "Save changes" : "Create highlight"}
            </button>
        </form>
    );
}
