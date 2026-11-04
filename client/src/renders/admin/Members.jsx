import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ROUTES } from "../../constants.js";
import Icon from "../../components/Icon.jsx";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SearchBox from "../../components/SearchBox.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import useLoad from "../../services/useLoad.js";
import { adminApi } from "../../services/api.js";

const A = ROUTES.admin;

export default function Members() {
    const [params, setParams] = useSearchParams();

    // the search text in the box, and the search that was sent (when Enter is pressed)
    const [text, setText] = useState(params.get("search") ?? "");
    const search = params.get("search") ?? "";

    const { data, loading, error, reload } = useLoad(() => adminApi.members(search), [search]);

    function handleSearch(event) {
        event.preventDefault();

        setParams(text.trim() ? { search: text.trim() } : {});
    }

    return (
        <>
            <PageHeader
                title="Members"
                back={A.home}
                right={
                    <Link className="header-action" to={A.newMember}>
                        + New
                    </Link>
                }
            />

            <div className="content">
                <form onSubmit={handleSearch}>
                    <SearchBox value={text} onChange={setText} placeholder="Search name, email, phone or id" />
                </form>

                <Status loading={loading} error={error} onRetry={reload} />

                {data && data.members.length === 0 && <div className="empty">No members found.</div>}

                {data?.members.map((member) => (
                    <Link key={member.id} className="list-item" to={A.member(member.id)}>
                        <span className="avatar" style={{ width: 44, height: 44, fontSize: "1.1rem" }}>
                            {member.name?.[0]?.toUpperCase()}
                        </span>

                        <div className="grow">
                            <div className="title">{member.name}</div>
                            <div className="meta">{member.email}</div>
                            <div className="meta">
                                #{member.id} - {member.phoneNumber}
                            </div>
                        </div>

                        <div className="center">
                            <StatusBadge status={member.status} />
                            <div className="meta">{member.point} pts</div>
                        </div>

                        <Icon name="next" size={18} />
                    </Link>
                ))}
            </div>
        </>
    );
}
