export const themeColors: Record<string, string> = {
    yellow: "#FACC00",
    amber: "#FFBF00",
    rose: "#FF6678",
    pink: "#FC64AB",
    lime: "#8AE500",
    green: "#00D696",
    emerald: "#00BD84",
};

export function getMapStyle(theme: string = "yellow", darkMode: boolean = false): google.maps.MapTypeStyle[] {
    const color = themeColors[theme] || themeColors.yellow;

    const baseStyle: google.maps.MapTypeStyle[] = [
        {
            "featureType": "poi",
            "stylers": [{ "visibility": "off" }]
        },
        {
            "featureType": "transit",
            "stylers": [{ "visibility": "off" }]
        },
        {
            "featureType": "road",
            "elementType": "labels.icon",
            "stylers": [{ "visibility": "off" }]
        }
    ];

    const themeStyle: google.maps.MapTypeStyle[] = [
        {
            "featureType": "road.highway",
            "elementType": "geometry.fill",
            "stylers": [
                { "color": color },
                { "lightness": 30 }, // Make it lighter so it's not too intense
                { "saturation": -20 }
            ]
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry.stroke",
            "stylers": [
                { "color": color },
                { "lightness": -20 } // Darker stroke
            ]
        },
        {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [
                { "hue": color },
                { "saturation": 20 },
                { "lightness": 50 }
            ]
        }
    ];

    // If we want a dark mode map, we need to invert base colors. 
    // For now, let's just apply the theme tint.

    return [...baseStyle, ...themeStyle];
}
