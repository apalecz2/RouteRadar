function getRouteColor(index, totalRoutes) {
    const hue = (index * 360 / totalRoutes) % 360;
    const saturation = 70;
    const lightness = 50;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function getRouteHighlightColor(index, totalRoutes) {
    const hue = (index * 360 / totalRoutes) % 360;
    const saturation = 80;
    const lightness = 70; // Lighter for highlight
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export { getRouteColor, getRouteHighlightColor }; 