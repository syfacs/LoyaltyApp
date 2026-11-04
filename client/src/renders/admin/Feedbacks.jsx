import { useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../constants.js";
import Field from "../../components/Field.jsx";
import Icon from "../../components/Icon.jsx";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import useLoad from "../../services/useLoad.js";
import { adminApi } from "../../services/api.js";

const A = ROUTES.admin;

export default function Feedbacks() {
    const [memberId, setMemberId] = useState("");

    // the server filters the feedback by member
    const { data, loading, error, reload } = useLoad(() => adminApi.feedbacks(memberId), [memberId]);

    return (
        <>
            <PageHeader title="Feedback" back={A.home} />

            <div className="content">
                <Field label="Member" as="select" value={memberId} onChange={(event) => setMemberId(event.target.value)}>
                    <option value="">All members</option>
                    {data?.members.map((member) => (
                        <option key={member.id} value={member.id}>
                            {member.name} (#{member.id})
                        </option>
                    ))}
                </Field>

                <Status loading={loading} error={error} onRetry={reload} />

                {data && data.feedbacks.length === 0 && <div className="empty">No feedback.</div>}

                {data?.feedbacks.map((item) => (
                    <Link key={item.id} className="list-item" to={A.feedbackItem(item.id)}>
                        <div className="grow">
                            <div className="title">{item.title}</div>
                            <div className="meta">
                                {item.memberName ?? "Guest"} - {item.location}
                            </div>
                            <div className="meta">
                                {"★".repeat(Number(item.rating) || 0)} {item.category}
                            </div>
                        </div>

                        <Icon name="next" size={18} />
                    </Link>
                ))}
            </div>
        </>
    );
}
