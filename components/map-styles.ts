export const themeColors: Record<string, string> = {
    yellow: "#FACC00",
    amber: "#FFBF00",
    rose: "#FF6678",
    pink: "#FC64AB",
    lime: "#8AE500",
    green: "#00D696",
    emerald: "#00BD84",
};

export type MapStyleMode = "default" | "retro" | "silver" | "dark";

export interface MapStyleOptions {
    styleMode: MapStyleMode;
    // showRoads, showLandmarks, showLabels replaced by density
    showRoads?: boolean; // deprecated
    showLandmarks?: boolean; // deprecated
    showLabels?: boolean; // deprecated
    roadDensity: number;
    landmarkDensity: number;
    labelDensity: number;
}

const RETRO_STYLE: google.maps.MapTypeStyle[] = [
    { elementType: "geometry", stylers: [{ color: "#ebe3cd" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#523735" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#f5f1e6" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c9b2a6" }] },
    { featureType: "administrative.land_parcel", elementType: "geometry.stroke", stylers: [{ color: "#dcd2be" }] },
    { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#ae9e90" }] },
    { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#dfd2ae" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#dfd2ae" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#93817c" }] },
    { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#a5b076" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#447530" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#f5f1e6" }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#fdfcf8" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f8c967" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#e9bc62" }] },
    { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#e98d58" }] },
    { featureType: "road.highway.controlled_access", elementType: "geometry.stroke", stylers: [{ color: "#db8555" }] },
    { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#806b63" }] },
    { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#dfd2ae" }] },
    { featureType: "transit.line", elementType: "labels.text.fill", stylers: [{ color: "#8f7d77" }] },
    { featureType: "transit.line", elementType: "labels.text.stroke", stylers: [{ color: "#ebe3cd" }] },
    { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#dfd2ae" }] },
    { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#b9d3c2" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#92998d" }] }
];

const SILVER_STYLE: google.maps.MapTypeStyle[] = [
    { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
    { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
    { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
    { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] }
];

const DARK_STYLE: google.maps.MapTypeStyle[] = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
    { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];

export function getMapStyle(
    theme: string = "yellow",
    resolvedTheme: string = "light",
    options: MapStyleOptions = { styleMode: "default", roadDensity: 3, landmarkDensity: 1, labelDensity: 3 }
): google.maps.MapTypeStyle[] {

    let baseStyle: google.maps.MapTypeStyle[] = [];

    // 1. Select Base Style
    if (options.styleMode === "retro") {
        baseStyle = [...RETRO_STYLE];
    } else if (options.styleMode === "silver") {
        baseStyle = [...SILVER_STYLE];
    } else if (options.styleMode === "dark") {
        baseStyle = [...DARK_STYLE];
    } else {
        // Default (Theme-based)
        const color = themeColors[theme] || themeColors.yellow;
        const isDark = resolvedTheme === "dark";
        const landColor = isDark ? "#242f3e" : "#f5f5f5";
        const waterColor = isDark ? "#17263c" : "#c9c9c9";
        const parkColor = isDark ? "#263c3f" : "#e6e6e6";

        baseStyle = [
            { elementType: "geometry", stylers: [{ color: landColor }] },
            { elementType: "labels.text.fill", stylers: [{ color: isDark ? "#746855" : "#616161" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: isDark ? "#242f3e" : "#f5f5f5" }] },
            { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: isDark ? "#d59563" : "#757575" }] },
            { featureType: "poi", stylers: [{ visibility: "off" }] }, // Hide by default in theme mode
            { featureType: "poi.park", elementType: "geometry", stylers: [{ color: parkColor }, { visibility: "simplified" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
            { featureType: "road", elementType: "geometry.fill", stylers: [{ color: isDark ? "#283d6a" : "#ffffff" }] },
            { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: isDark ? "#9ca5b3" : "#757575" }] },
            { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: isDark ? "#38414e" : "#dedede" }] },
            { featureType: "road.highway", elementType: "geometry", stylers: [{ color: isDark ? "#746855" : "#dadada" }] },
            {
                featureType: "road.highway", elementType: "geometry.fill",
                stylers: [{ color: color }, { lightness: isDark ? -20 : 0 }]
            },
            {
                featureType: "road.highway", elementType: "geometry.stroke",
                stylers: [{ color: color }, { lightness: isDark ? -40 : -20 }, { weight: 0.2 }]
            },
            { featureType: "transit", elementType: "geometry", stylers: [{ color: isDark ? "#2f3948" : "#eeeeee" }] },
            { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: isDark ? "#d59563" : "#757575" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: waterColor }] },
            { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: isDark ? "#515c6d" : "#9e9e9e" }] },
            { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: isDark ? "#17263c" : "#ffffff" }] }
        ];
    }

    // 2. Apply Visibility Overrides based on Density (0-3)
    const overrides: google.maps.MapTypeStyle[] = [];

    // Roads
    if (options.roadDensity === 0) {
        overrides.push({ featureType: "road", stylers: [{ visibility: "off" }] });
    } else if (options.roadDensity === 1) {
        overrides.push(
            { featureType: "road.local", stylers: [{ visibility: "off" }] },
            { featureType: "road.arterial", stylers: [{ visibility: "simplified" }] }, // Keep arterials but simplified
            { featureType: "road.highway", stylers: [{ visibility: "simplified" }] }
        );
    } else if (options.roadDensity === 2) {
        // Medium: Ensure standard visibility
        overrides.push(
            { featureType: "road", stylers: [{ visibility: "on" }] },
            { featureType: "road.local", stylers: [{ visibility: "on" }] }
        );
    } else {
        // High (3): Force all roads on
        overrides.push({ featureType: "road", stylers: [{ visibility: "on" }] });
    }

    // Landmarks
    if (options.landmarkDensity === 0) {
        overrides.push({ featureType: "poi", stylers: [{ visibility: "off" }] });
    } else if (options.landmarkDensity === 1) {
        // Low: Hide business/govt, Keep parks (optional but "Low" implies less clutter)
        overrides.push(
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "poi.park", stylers: [{ visibility: "simplified" }] } // Keep parks but simple
        );
    } else if (options.landmarkDensity === 2) {
        // Med: Standard
        overrides.push(
            { featureType: "poi", stylers: [{ visibility: "simplified" }] },
            { featureType: "poi.park", stylers: [{ visibility: "on" }] },
            { featureType: "poi.business", stylers: [{ visibility: "simplified" }] }
        );
    } else {
        // High: All on
        overrides.push({ featureType: "poi", stylers: [{ visibility: "on" }] });
    }

    // Labels
    if (options.labelDensity === 0) {
        overrides.push(
            { elementType: "labels", stylers: [{ visibility: "off" }] }
        );
    } else if (options.labelDensity === 1) {
        // Low: Hide POI labels, reduced road labels
        overrides.push(
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
            { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
            { featureType: "road", elementType: "labels", stylers: [{ visibility: "on" }] } // Keep main road labels
        );
    } else {
        // Med/High
        overrides.push({ elementType: "labels", stylers: [{ visibility: "on" }] });
    }

    return [...baseStyle, ...overrides];
}
