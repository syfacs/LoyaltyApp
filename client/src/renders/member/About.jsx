import { ABOUT_PARAGRAPHS, ABOUT_STEPS, ABOUT_TITLE, APP_TAGLINE } from "../../constants.js";
import PageHeader from "../../components/PageHeader.jsx";

export default function About() {
    return (
        <>
            <PageHeader title="About" back={false} />

            <div className="content">
                <div className="card stack">
                    <h2>{ABOUT_TITLE}</h2>
                    <p className="muted">{APP_TAGLINE}</p>

                    {ABOUT_PARAGRAPHS.map((text) => (
                        <p key={text}>{text}</p>
                    ))}
                </div>

                <div className="card">
                    <div className="card-title">How it works</div>

                    <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
                        {ABOUT_STEPS.map((step) => (
                            <li key={step}>{step}</li>
                        ))}
                    </ol>
                </div>
            </div>
        </>
    );
}
