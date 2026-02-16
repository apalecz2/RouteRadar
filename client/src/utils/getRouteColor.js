function getRouteColor(index) {
    // Use the Golden Angle to distribute colors evenly but not in rainbow order
    const goldenAngle = 137.508;
    const hue = (index * goldenAngle) % 360;
    const saturation = 70;
    const lightness = 45; // Slightly darker for better visibility against map
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function getRouteHighlightColor(index) {
    const goldenAngle = 137.508;
    const hue = (index * goldenAngle) % 360;
    const saturation = 90; // More saturated for highlight
    const lightness = 60; // Lighter/Brighter for highlight
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export { getRouteColor, getRouteHighlightColor }; 