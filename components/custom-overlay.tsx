import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMap } from '@vis.gl/react-google-maps';

type CustomOverlayProps = {
    position: google.maps.LatLngLiteral;
    children: React.ReactNode;
    zIndex?: number;
    anchor?: 'center' | 'bottom';
    visible?: boolean;
};

export function CustomOverlay({ position, children, zIndex = 0, anchor = 'bottom', visible = true }: CustomOverlayProps) {
    const map = useMap();
    const [container, setContainer] = useState<HTMLDivElement | null>(null);
    const overlayRef = useRef<google.maps.OverlayView | null>(null);

    // 1. Create Container
    useEffect(() => {
        if (typeof document === 'undefined') return;
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.cursor = 'pointer';
        div.style.zIndex = zIndex.toString();
        // Prevent map events from propagating to the overlay content (optional but good for clicks)
        // google.maps.OverlayView.preventMapHitsFrom(div); // Not always available/needed
        setContainer(div);
        return () => {
            div.remove();
        };
    }, []);

    // 2. Initialize OverlayView
    useEffect(() => {
        if (!map || !container) return;

        // Define the class dynamically to close over 'container' if needed, 
        // but cleaner to pass it in constructor/properties.
        class SimpleOverlay extends google.maps.OverlayView {
            container: HTMLDivElement;
            position: google.maps.LatLngLiteral;
            zIndex: number;
            anchor: 'center' | 'bottom';

            constructor(container: HTMLDivElement) {
                super();
                this.container = container;
                this.position = { lat: 0, lng: 0 }; // Default
                this.zIndex = 0;
                this.anchor = 'bottom';
            }

            onAdd() {
                const panes = this.getPanes();
                if (panes?.floatPane) {
                    panes.floatPane.appendChild(this.container);
                } else if (panes?.overlayMouseTarget) {
                    // Fallback to overlayMouseTarget if floatPane prevents clicks?
                    // floatPane is usually above everything. 
                    panes.overlayMouseTarget.appendChild(this.container);
                }
            }

            onRemove() {
                if (this.container.parentNode) {
                    this.container.parentNode.removeChild(this.container);
                }
            }

            draw() {
                const projection = this.getProjection();
                if (!projection || !this.position) return;

                const point = projection.fromLatLngToDivPixel(this.position);
                // console.log('CustomOverlay Draw:', { position: this.position, point, anchor: this.anchor }); 

                if (!point) return;

                this.container.style.left = point.x + 'px';
                this.container.style.top = point.y + 'px';
                this.container.style.top = point.y + 'px';

                // transform logic
                if (this.anchor === 'center') {
                    this.container.style.transform = 'translate(-50%, -50%)';
                } else {
                    this.container.style.transform = 'translate(-50%, -100%)';
                }
            }
        }

        const overlay = new SimpleOverlay(container);
        overlay.setMap(map);
        overlayRef.current = overlay;

        return () => {
            overlay.setMap(null);
            overlayRef.current = null;
        };
    }, [map, container]);

    // 3. Update Overlay Properties
    useEffect(() => {
        const overlay = overlayRef.current as any; // Cast to access custom props if TS complains
        if (overlay) {
            overlay.position = position;
            overlay.zIndex = zIndex;
            overlay.anchor = anchor;
            overlay.container.style.zIndex = zIndex.toString();
            // Force redraw
            overlay.draw();
        }
    }, [position, zIndex, anchor]);

    // 4. Toggle visibility at the DOM level
    useEffect(() => {
        if (container) {
            container.style.display = visible ? '' : 'none';
        }
    }, [visible, container]);

    if (!container) return null;

    return createPortal(children, container);
}
