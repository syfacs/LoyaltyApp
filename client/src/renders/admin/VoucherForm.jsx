import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DAYS_OF_WEEK, ROUTES } from "../../constants.js";
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

const NEW_RULE = { dayOfWeek: "Monday", startTime: "09:00", endTime: "18:00" };

// create a voucher (/admin/vouchers/new) or edit one (/admin/vouchers/5/edit)
export default function VoucherForm() {
    const { id } = useParams();

    const { data, loading, error, reload } = useLoad(() => (id ? adminApi.voucher(id) : Promise.resolve(null)), [id]);

    return (
        <>
            <PageHeader title={id ? "Edit voucher" : "New voucher"} back={id ? A.voucher(id) : A.vouchers} />

            <div className="content">
                <Status loading={loading} error={error} onRetry={reload} />

                {!loading && !error && <Fields key={id} voucher={data?.voucher} />}
            </div>
        </>
    );
}

function Fields({ voucher }) {
    const navigate = useNavigate();
    const toast = useToast();

    const today = dateInput();
    const nextYear = dateInput(365);

    const form = useForm({
        name: voucher?.name ?? "",
        title: voucher?.title ?? "",
        subtitle: voucher?.subtitle ?? "",
        shortTitle: voucher?.shortTitle ?? "",
        description: voucher?.description ?? "",
        tnC: voucher?.tnC ?? "",
        createdDate: toDateInput(voucher?.createdDate) || today,
        expiredDate: toDateInput(voucher?.expiredDate) || nextYear,
        image: null,
    });

    // the days and times the voucher can be used. No rules means any day and time.
    const [rules, setRules] = useState(voucher?.rules ?? []);
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    function changeRule(index, name, value) {
        setRules((current) => current.map((rule, i) => (i === index ? { ...rule, [name]: value } : rule)));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const v = form.values;

        const ruleError = rules.some((rule) => !rule.startTime || !rule.endTime || rule.endTime <= rule.startTime)
            ? "On every day the end time must be later than the start time."
            : "";

        const found = onlyErrors({
            name: checkRequired(v.name, "Name"),
            dates: checkDates(v.createdDate, v.expiredDate),
            rules: ruleError,
            image: checkImage(v.image),
        });
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        // only day and times go to the server, it does not need the ids
        const body = {
            ...v,
            rules: JSON.stringify(rules.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }))),
        };

        setBusy(true);

        try {
            const response = voucher
                ? await adminApi.editVoucher({ id: voucher.id, ...body })
                : await adminApi.createVoucher(body);

            toast.success(response.message);
            navigate(voucher ? A.voucher(voucher.id) : A.vouchers, { replace: true });
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
            <Field label="Sub title" {...form.bind("subtitle")} />
            <Field label="Short title" {...form.bind("shortTitle")} />
            <Field label="Description" as="textarea" {...form.bind("description")} />
            <Field label="Terms and conditions" as="textarea" {...form.bind("tnC")} />

            <div className="grid-2">
                <Field label="Valid from" type="date" {...form.bind("createdDate")} />
                <Field label="Valid until" type="date" {...form.bind("expiredDate")} />
            </div>
            {errors.dates && <span className="field-error" style={{ marginTop: -8, marginBottom: 12 }}>{errors.dates}</span>}

            <span className="field-label">Days and times it can be used</span>
            <p className="field-hint" style={{ marginBottom: 8 }}>
                Leave empty if the voucher can be used on any day and time.
            </p>

            {rules.map((rule, index) => (
                <div key={index} className="rule-row">
                    <select className="input" value={rule.dayOfWeek} onChange={(event) => changeRule(index, "dayOfWeek", event.target.value)}>
                        {DAYS_OF_WEEK.map((day) => (
                            <option key={day} value={day}>
                                {day}
                            </option>
                        ))}
                    </select>

                    <input className="input" type="time" value={rule.startTime} onChange={(event) => changeRule(index, "startTime", event.target.value)} />
                    <input className="input" type="time" value={rule.endTime} onChange={(event) => changeRule(index, "endTime", event.target.value)} />

                    <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => setRules((current) => current.filter((_, i) => i !== index))} aria-label="Remove rule">
                        X
                    </button>
                </div>
            ))}

            {errors.rules && <span className="field-error">{errors.rules}</span>}

            <button type="button" className="btn btn-outline btn-sm" style={{ margin: "6px 0 16px" }} onClick={() => setRules((current) => [...current, NEW_RULE])}>
                + Add a day
            </button>

            {voucher?.imageUrl && (
                <div style={{ marginBottom: 12 }}>
                    <span className="field-label">Current image</span>
                    <Thumb src={voucher.imageUrl} alt={voucher.name} />
                </div>
            )}

            <Field
                label={voucher ? "Replace image (optional)" : "Image (optional)"}
                type="file"
                accept="image/*"
                error={errors.image}
                onChange={(event) => form.set("image", event.target.files[0] ?? null)}
            />

            <button type="submit" className="btn btn-block" disabled={busy}>
                {busy ? "Please wait..." : voucher ? "Save changes" : "Create voucher"}
            </button>
        </form>
    );
}
