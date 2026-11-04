import { useState } from "react";
import { FEEDBACK_CATEGORIES, ROUTES } from "../../constants.js";
import Field from "../../components/Field.jsx";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Stars from "../../components/Stars.jsx";
import { useToast } from "../../context/ToastContext.js";
import useLoad from "../../services/useLoad.js";
import { memberApi } from "../../services/api.js";
import { checkRequired, onlyErrors } from "../../utils/validators.js";
import useForm from "../../utils/useForm.js";

const EMPTY_FORM = { outletGuid: "", category: "", rating: 0, title: "", description: "" };

export default function Feedback() {
    const toast = useToast();

    const outlets = useLoad(() => memberApi.outlets(), []);

    const form = useForm(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        const v = form.values;

        const found = onlyErrors({
            outletGuid: checkRequired(v.outletGuid, "Outlet"),
            category: checkRequired(v.category, "Category"),
            rating: v.rating >= 1 ? "" : "Please give a rating.",
            title: checkRequired(v.title, "Title"),
            description: checkRequired(v.description, "Description"),
        });
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setBusy(true);

        try {
            const response = await memberApi.sendFeedback(v);

            toast.success(response.message);
            form.setValues(EMPTY_FORM);
        } catch (error) {
            if (!error.sessionExpired) toast.error(error.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <PageHeader title="Feedback" back={ROUTES.member.account} />

            <div className="content">
                <Status loading={outlets.loading} error={outlets.error} onRetry={outlets.reload} />

                {outlets.data && (
                    <form className="auth-card" onSubmit={handleSubmit} noValidate>
                        <Field label="Outlet" as="select" error={errors.outletGuid} {...form.bind("outletGuid")}>
                            <option value="">Choose an outlet</option>
                            {outlets.data.outlets.map((outlet) => (
                                <option key={outlet.guid} value={outlet.guid}>
                                    {outlet.name}
                                </option>
                            ))}
                        </Field>

                        <Field label="Category" as="select" error={errors.category} {...form.bind("category")}>
                            <option value="">Choose a category</option>
                            {FEEDBACK_CATEGORIES.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </Field>

                        <span className="field-label">Rating</span>
                        <Stars value={form.values.rating} onChange={(rating) => form.set("rating", rating)} />
                        {errors.rating && <span className="field-error" style={{ marginTop: -10, marginBottom: 12 }}>{errors.rating}</span>}

                        <Field label="Title" maxLength={100} error={errors.title} {...form.bind("title")} />

                        <Field
                            label="Tell us more"
                            as="textarea"
                            error={errors.description}
                            {...form.bind("description")}
                        />

                        <button type="submit" className="btn btn-block" disabled={busy}>
                            {busy ? "Please wait..." : "Send feedback"}
                        </button>
                    </form>
                )}
            </div>
        </>
    );
}
