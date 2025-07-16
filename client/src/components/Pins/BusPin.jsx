import { useRef, useEffect } from 'react';

// BusPin with circle and directional arrow
export function BusPin({ color = 'white', rotation = 0, withPing = false }) {
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (!wrapperRef.current) return;
        const wrapper = wrapperRef.current;
        wrapper.innerHTML = '';

        wrapper.style.position = 'relative';
        wrapper.style.width = '24px';
        wrapper.style.height = '24px';
        wrapper.style.transform = 'translateY(50%)';

        // Set custom properties for highlight logic
        wrapper.__pinColor = color;
        wrapper.__pinRotation = rotation;
        wrapper.__pinPing = withPing;

        if (withPing) {
            const ping = document.createElement('div');
            ping.className = 'bus-ping';
            // Set ping color to match the route color
            ping.style.background = color;
            wrapper.appendChild(ping);
        }

        // --- Black border circle at the bottom ---
        const borderCircle = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        borderCircle.setAttribute("viewBox", "0 0 24 24");
        borderCircle.setAttribute("width", "24");
        borderCircle.setAttribute("height", "24");
        borderCircle.style.position = 'absolute';
        borderCircle.style.top = '0';
        borderCircle.style.left = '0';

        const borderCirclePath = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        borderCirclePath.setAttribute("cx", "12");
        borderCirclePath.setAttribute("cy", "12");
        borderCirclePath.setAttribute("r", "12"); // Increased radius for visible border
        borderCirclePath.setAttribute("fill", "#000");
        borderCircle.appendChild(borderCirclePath);

        // --- Direction Arrow (rotated and positioned using trigonometry) ---
        const arrowSize = 16;
        const radiusFromCenter = 11; // Distance from center of circle to where the arrow should go

        // Compute direction in radians
        const radians = (rotation % 360) * (Math.PI / 180);

        // Compute arrow center position
        const centerX = 12 + Math.sin(radians) * radiusFromCenter;
        const centerY = 12 - Math.cos(radians) * radiusFromCenter;

        // Convert to top-left for SVG placement
        const left = centerX - arrowSize / 2;
        const top = centerY - arrowSize / 2;

        // Create arrow SVG
        const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        arrow.setAttribute("viewBox", "0 0 24 24");
        arrow.setAttribute("width", `${arrowSize}px`);
        arrow.setAttribute("height", `${arrowSize}px`);
        arrow.style.position = 'absolute';
        arrow.style.left = `${left}px`;
        arrow.style.top = `${top}px`;
        arrow.style.transform = `rotate(${rotation}deg)`;
        arrow.style.transformOrigin = 'center center';
        arrow.style.zIndex = '1';

        // Larger and centered upward triangle
        const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        // Make the arrow wider by increasing the base width
        arrowPath.setAttribute("d", "M12 4L22 18H2L12 4Z");
        arrowPath.setAttribute("fill", color);       // Arrow fill matches pin color
        arrowPath.setAttribute("stroke", "#000000");     // Black outline
        arrowPath.setAttribute("stroke-width", "3");     // Thickness
        arrowPath.setAttribute("stroke-linejoin", "round"); // Optional: smooth corners

        arrow.appendChild(arrowPath);

        // --- Circle background (no border, sits above arrow) ---
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        circle.setAttribute("viewBox", "0 0 24 24");
        circle.setAttribute("width", "24");
        circle.setAttribute("height", "24");
        circle.style.position = 'absolute';
        circle.style.top = '0';
        circle.style.left = '0';
        circle.style.zIndex = '2';

        const circlePath = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circlePath.setAttribute("cx", "12");
        circlePath.setAttribute("cy", "12");
        circlePath.setAttribute("r", "10");
        circlePath.setAttribute("fill", color);
        // No border
        circle.appendChild(circlePath);

        // --- Bus icon ---
        const bus = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        bus.setAttribute("viewBox", "0 -960 960 960");
        bus.setAttribute("width", "14");
        bus.setAttribute("height", "14");
        bus.style.position = 'absolute';
        bus.style.left = '5px'; // (24 - 14)/2
        bus.style.top = '5px';
        bus.style.zIndex = '3';

        const busPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        busPath.setAttribute("d", "M320-200v20q0 25-17.5 42.5T260-120q-25 0-42.5-17.5T200-180v-62q-18-20-29-44.5T160-340v-380q0-83 77-121.5T480-880q172 0 246 37t74 123v380q0 29-11 53.5T760-242v62q0 25-17.5 42.5T700-120q-25 0-42.5-17.5T640-180v-20H320Zm162-560h224-448 224Zm158 280H240h480-80Zm-400-80h480v-120H240v120Zm100 240q25 0 42.5-17.5T400-380q0-25-17.5-42.5T340-440q-25 0-42.5 17.5T280-380q0 25 17.5 42.5T340-320Zm280 0q25 0 42.5-17.5T680-380q0-25-17.5-42.5T620-440q-25 0-42.5 17.5T560-380q0 25 17.5 42.5T620-320ZM258-760h448q-15-17-64.5-28.5T482-800q-107 0-156.5 12.5T258-760Zm62 480h320q33 0 56.5-23.5T720-360v-120H240v120q0 33 23.5 56.5T320-280Z");
        busPath.setAttribute("fill", "#fff");

        bus.appendChild(busPath);

        // Compose (order: border circle, arrow, colored circle, bus)
        wrapper.appendChild(borderCircle);
        wrapper.appendChild(arrow);
        wrapper.appendChild(circle);
        wrapper.appendChild(bus);

    }, [color, rotation, withPing]);

    return <div ref={wrapperRef} />;
}
