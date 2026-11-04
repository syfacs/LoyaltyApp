import { useEffect, useRef } from "react";

// A row of cards that scrolls sideways.
// On a computer the mouse wheel scrolls it sideways too (no Shift needed). At the first or last card
// the wheel goes back to scrolling the page, so the page never gets stuck.
export default function Carousel({ children }) {
    const row = useRef(null);

    useEffect(() => {
        const element = row.current;

        function handleWheel(event) {
            // the user is already scrolling sideways (touchpad or Shift)
            if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

            const maxScroll = element.scrollWidth - element.clientWidth;
            const atStart = element.scrollLeft <= 0 && event.deltaY < 0;
            const atEnd = element.scrollLeft >= maxScroll - 1 && event.deltaY > 0;

            if (maxScroll <= 0 || atStart || atEnd) return;

            // some browsers send the wheel in lines instead of pixels
            const distance = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;

            event.preventDefault();
            element.scrollLeft += distance;
        }

        // not passive, because we have to stop the page from scrolling
        element.addEventListener("wheel", handleWheel, { passive: false });

        return () => element.removeEventListener("wheel", handleWheel);
    }, []);

    return (
        <div className="carousel" ref={row}>
            {children}
        </div>
    );
}
