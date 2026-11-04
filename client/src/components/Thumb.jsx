import { useState } from "react";
import Icon from "./Icon.jsx";

// A picture. When there is no picture (or it cannot be loaded) a placeholder is shown instead.
export default function Thumb({ src, alt = "", small = false }) {
    const [failed, setFailed] = useState(false);
    const className = small ? "thumb small-thumb" : "thumb";

    if (!src || failed) {
        return (
            <div className={className}>
                <Icon name="image" size={small ? 24 : 34} />
            </div>
        );
    }

    return <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}
