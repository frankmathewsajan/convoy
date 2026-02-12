import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMap } from '@vis.gl/react-google-maps';

type CustomOverlayProps = {
    position: google.maps.LatLngLiteral;
    children: React.ReactNode;
    zIndex?: number;
};

export function CustomOverlay({ position, children, zIndex = 0 }: CustomOverlayProps) {
    const map = useMap();
    const [container, setContainer] = useState<HTMLDivElement | null>(null);

    // Create the overlay instance once
    const overlay = useMemo(() => {
        if (!map) return null;

        class Overlay extends google.maps.OverlayView {
            container: HTMLDivElement;
            position: google.maps.LatLngLiteral;
            zIndex: number;

            constructor(container: HTMLDivElement, position: google.maps.LatLngLiteral, zIndex: number) {
                super();
                this.container = container;
                this.position = position;
                this.zIndex = zIndex;
            }

            onAdd() {
                const floatPane = this.getPanes()?.floatPane;
                if (floatPane) {
                    floatPane.appendChild(this.container);
                }
            }

            onRemove() {
                if (this.container.parentNode) {
                    this.container.parentNode.removeChild(this.container);
                }
            }

            draw() {
                const projection = this.getProjection();
                if (!projection) return;

                const point = projection.fromLatLngToDivPixel(this.position);
                if (!point) return;

                // Simplify centering: we assume the content is centered at (0,0) of the container
                // or we position the container top-left at the point and use CSS transform to center.
                this.container.style.left = point.x + 'px';
                this.container.style.top = point.y + 'px';
                this.container.style.position = 'absolute';
                this.container.style.transform = 'translate(-50%, -100%)'; // Anchor bottom-center (standard pin) by default? 
                // Actually, for a "Pin", usually bottom-center. For "Pulse", maybe center-center.
                // Let's default to translate(-50%, -50%) for generic center, or allow passing anchor.
                // The user's Pulse is center-center. The Pin is bottom-center.
                // I'll stick to top/left setting and let CSS inside handle the rest? 
                // No, `OverlayView` usually requires absolute positioning.
                // Let's use `translate(-50%, -50%)` as a safe default for "center" alignment, 
                // but for a Pin it might need `-50%, -100%`.
                // I'll make the container strictly positioned at the point, and children can transform.
                // Actually, if I just set left/top, it's top-left anchored.
            }
        }

        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.cursor = 'pointer'; // Make it clickable
        div.style.zIndex = zIndex.toString();
        setContainer(div);

        return new Overlay(div, position, zIndex);
    }, [map]);

    // Update position and zIndex
    useEffect(() => {
        if (overlay && container) {
            overlay.position = position;
            overlay.zIndex = zIndex;
            overlay.draw(); // Force redraw
        }
    }, [position, zIndex, overlay, container]);

    // Add/Remove from map
    useEffect(() => {
        if (overlay && map && container) {
            overlay.setMap(map);
            return () => overlay.setMap(null);
        }
    }, [overlay, map, container]);

    if (!container) return null;

    return createPortal(children, container);
}
