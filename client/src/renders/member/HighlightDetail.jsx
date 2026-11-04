import { useParams } from "react-router-dom";
import { ROUTES } from "../../constants.js";
import { Status } from "../../components/Loader.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Thumb from "../../components/Thumb.jsx";
import useLoad from "../../services/useLoad.js";
import { memberApi } from "../../services/api.js";
import { formatDate } from "../../utils/format.js";

export default function HighlightDetail() {
    const { guid } = useParams();

    const { data, loading, error, reload } = useLoad(() => memberApi.highlight(guid), [guid]);
    const highlight = data?.highlight;

    return (
        <>
            <PageHeader title="Promotion" back={ROUTES.member.home} />

            <div className="content">
                <Status loading={loading} error={error} onRetry={reload} />

                {highlight && (
                    <>
                        <div className="card">
                            <Thumb src={highlight.imageUrl} alt={highlight.title} />

                            <h2 style={{ marginTop: 14 }}>{highlight.title}</h2>
                            {highlight.subTitle && <p className="muted">{highlight.subTitle}</p>}
                            <p className="muted small" style={{ marginTop: 6 }}>
                                Until {formatDate(highlight.expireDate)}
                            </p>
                        </div>

                        {highlight.description && (
                            <div className="card">
                                <div className="card-title">Details</div>
                                <p className="pre">{highlight.description}</p>
                            </div>
                        )}

                        {highlight.tnC && (
                            <div className="card">
                                <div className="card-title">Terms and conditions</div>
                                <p className="pre muted small">{highlight.tnC}</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}
