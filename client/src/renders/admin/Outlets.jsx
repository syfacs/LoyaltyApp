import { useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../constants.js";
import Field from "../../components/Field.jsx";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { useToast } from "../../context/ToastContext.js";
import useLoad from "../../services/useLoad.js";
import { adminApi } from "../../services/api.js";
import { checkRequired } from "../../utils/validators.js";

const A = ROUTES.admin;

export default function Outlets() {
    const toast = useToast();

    const { data, loading, error, reload } = useLoad(() => adminApi.outlets(), []);

    const [name, setName] = useState("");
    const [nameError, setNameError] = useState("");
    const [busy, setBusy] = useState(false);

    async function handleCreate(event) {
        event.preventDefault();

        const found = checkRequired(name, "Outlet name");
        setNameError(found);
        if (found) return;

        setBusy(true);

        try {
            const response = await adminApi.createOutlet(name.trim());

            toast.success(response.message);
            setName("");
            reload();
        } catch (err) {
            if (!err.sessionExpired) toast.error(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function handleToggle(outlet) {
        const action = outlet.status === "Active" ? "deactivate" : "activate";
        if (!window.confirm(`Do you want to ${action} ${outlet.name}?`)) return;

        try {
            const response = await adminApi.toggleOutlet(outlet.id);

            toast.success(response.message);
            reload();
        } catch (err) {
            if (!err.sessionExpired) toast.error(err.message);
        }
    }

    return (
        <>
            <PageHeader title="Outlets & staff" back={A.home} />

            <div className="content">
                <form className="card" onSubmit={handleCreate} noValidate>
                    <div className="card-title">Add an outlet</div>

                    <Field
                        label="Outlet name"
                        value={name}
                        error={nameError}
                        onChange={(event) => setName(event.target.value)}
                    />

                    <button type="submit" className="btn btn-block" disabled={busy}>
                        {busy ? "Please wait..." : "Add outlet"}
                    </button>
                </form>

                <Status loading={loading} error={error} onRetry={reload} />

                {data && data.outlets.length === 0 && <div className="empty">No outlets yet.</div>}

                {data?.outlets.map((outlet) => (
                    <div key={outlet.id} className="card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                            <div className="title" style={{ fontWeight: 700 }}>
                                {outlet.name}
                            </div>
                            <StatusBadge status={outlet.status} />
                        </div>

                        <div className="actions">
                            <Link className="btn btn-sm" to={A.staff(outlet.id)}>
                                Staff & PINs
                            </Link>

                            <button type="button" className="btn btn-outline btn-sm" onClick={() => handleToggle(outlet)}>
                                {outlet.status === "Active" ? "Deactivate" : "Activate"}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
