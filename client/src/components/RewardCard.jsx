import { Link } from "react-router-dom";
import { POINTS_LABEL, ROUTES } from "../constants.js";
import { formatPoints } from "../utils/format.js";
import Thumb from "./Thumb.jsx";

// a reward in a grid or a carousel
export default function RewardCard({ reward }) {
    return (
        <Link className="reward-card" to={ROUTES.member.reward(reward.guid)}>
            <Thumb src={reward.imageUrl} alt={reward.title ?? reward.name} />

            <div className="body">
                <div className="title">{reward.title ?? reward.name}</div>
                <span className="cost">
                    {formatPoints(reward.point)} {POINTS_LABEL}
                </span>
            </div>
        </Link>
    );
}
