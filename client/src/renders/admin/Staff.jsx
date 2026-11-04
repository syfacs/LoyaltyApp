import { useState } from "react";
import { useParams } from "react-router-dom";
import { ROUTES, STAFF_PIN_LENGTH } from "../../constants.js";
import Field from "../../components/Field.jsx";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { useToast } from "../../context/ToastContext.js";
import useLoad from "../../services/useLoad.js";
import { adminApi } from "../../services/api.js";
import { checkPin, checkRequired, onlyErrors } from "../../utils/validators.js";
import useForm from "../../utils/useForm.js";

const EMPTY_FORM = { outletStaffName: "", pin: "", role: "" };

// the staff of one outlet and their PINs
export default function Staff() {
    const { outletId } = useParams();
    const toast = useToast();

    // the staff list and the outlet name (for the title)
    const { data, loading, error, reload } = useLoad(async () => {
        const [staff, outlets] = await Promise.all([adminApi.staff(outletId), adminApi.outlets()]);

        return { staff: staff.staff, outlet: outlets.outlets.find((outlet) => String(outlet.id) === outletId) };
    }, [outletId]);

    const form = useForm(EMPTY_FORM);

    // the staff member being edited, or null when a new one is added
    const [editing, setEditing] = useState(null);
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    function startEdit(person) {
        setEditing(person);
        form.setValues({ outletStaffName: person.name ?? "", pin: person.pin ?? "", role: person.role ?? "" });
        setErrors({});
    }

    function cancelEdit() {
        setEditing(null);
        form.setValues(EMPTY_FORM);
        setErrors({});
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const v = form.values;

        const found = onlyErrors({
            outletStaffName: checkRequired(v.outletStaffName, "Name"),
            pin: checkPin(v.pin),
        });
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setBusy(true);

        try {
            const body = { ...v, outletID: Number(outletId) };

            const response = editing
                ? await adminApi.updateStaff({ ...body, outletStaffID: editing.id })
                : await adminApi.createStaff({ ...body, outletStaffID: 0 });

            toast.success(response.message);
            cancelEdit();
            reload();
        } catch (err) {
            if (!err.sessionExpired) toast.error(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function handleDelete(person) {
        if (!window.confirm(`Delete ${person.name}?`)) return;

        try {
            const response = await adminApi.deleteStaff(person.id);

            toast.success(response.message);
            if (editing?.id === person.id) cancelEdit();
            reload();
        } catch (err) {
            if (!err.sessionExpired) toast.error(err.message);
        }
    }

    return (
        <>
            <PageHeader title={data?.outlet ? `${data.outlet.name} staff` : "Staff"} back={ROUTES.admin.outlets} />

            <div className="content">
                <form className="card" onSubmit={handleSubmit} noValidate>
                    <div className="card-title">{editing ? `Edit ${editing.name}` : "Add a staff member"}</div>

                    <Field label="Name" error={errors.outletStaffName} {...form.bind("outletStaffName")} />

                    <Field
                        label={`Staff PIN (${STAFF_PIN_LENGTH} digits)`}
                        inputMode="numeric"
                        maxLength={STAFF_PIN_LENGTH}
                        autoComplete="off"
                        error={errors.pin}
                        {...form.bind("pin")}
                    />

                    <Field label="Role (optional)" {...form.bind("role")} />

                    <div className="actions" style={{ marginTop: 0 }}>
                        <button type="submit" className="btn" disabled={busy}>
                            {busy ? "Please wait..." : editing ? "Save changes" : "Add staff"}
                        </button>

                        {editing && (
                            <button type="button" className="btn btn-outline" onClick={cancelEdit}>
                                Cancel
                            </button>
                        )}
                    </div>
                </form>

                <Status loading={loading} error={error} onRetry={reload} />

                {data && data.staff.length === 0 && <div className="empty">No staff in this outlet yet.</div>}

                {data?.staff.map((person) => (
                    <div key={person.id} className="list-item">
                        <div className="grow">
                            <div className="title">{person.name}</div>
                            <div className="meta">
                                PIN: <b>{person.pin}</b>
                                {person.role ? ` - ${person.role}` : ""}
                            </div>
                        </div>

                        <button type="button" className="btn btn-outline btn-sm" onClick={() => startEdit(person)}>
                            Edit
                        </button>
                        <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => handleDelete(person)}>
                            Delete
                        </button>
                    </div>
                ))}
            </div>
        </>
    );
}
