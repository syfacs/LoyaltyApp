import { Link } from "react-router-dom";
import { ROUTES } from "../constants.js";
import PageHeader from "../components/PageHeader.jsx";

export default function NotFound() {
    return (
        <div className="screen">
            <PageHeader title="Page not found" back={false} />

            <div className="content">
                <div className="card center">
                    <p style={{ marginBottom: 14 }}>We could not find the page you are looking for.</p>

                    <Link className="btn" to={ROUTES.member.home}>
                        Go to home
                    </Link>
                </div>
            </div>
        </div>
    );
}
