import React, { useMemo, useState, useRef, useEffect } from 'react';
import { loadDynamicComponent } from '../../../utils/dynamicComponentLoader';
import { AlchemyVisual } from './AlchemyVisual';

interface DynamicVisualProps {
    code: string;
    isActive?: boolean;
    fallbackElement?: string; // For AlchemyVisual fallback
}

export const DynamicVisual = React.memo<DynamicVisualProps>(function DynamicVisual({
    code,
    isActive = false,
    fallbackElement = ''
}) {
    // Memoize compilation to prevent re-running on every render
    const Component = useMemo(() => {
        if (!code) return null;
        return loadDynamicComponent(code);
    }, [code]);

    const [snapshot, setSnapshot] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hasCaptured = useRef(false);

    // Reset snapshot when visual payload changes
    useEffect(() => {
        hasCaptured.current = false;
        setSnapshot(null);
    }, [code]);

    // Capture static SVG snapshot after Component settles at isActive=false state.
    // Two RAFs: first for React commit, second for framer-motion to write initial attribute values.
    useEffect(() => {
        if (hasCaptured.current || !Component || isActive) return;

        let raf1: number, raf2: number;
        raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => {
                if (!containerRef.current || hasCaptured.current) return;
                if (!containerRef.current.querySelector('svg')) return;

                // Capture full innerHTML to preserve wrapper divs (e.g. centering containers)
                const prefix = Math.random().toString(36).slice(2, 8);
                const raw = containerRef.current.innerHTML;

                // Uniquify all SVG IDs to prevent cross-card filter/gradient conflicts
                const unique = raw
                    .replace(/\bid="([^"]+)"/g, `id="${prefix}-$1"`)
                    .replace(/\burl\(#([^)]+)\)/g, `url(#${prefix}-$1)`);

                // Normalize SVG dimensions: force 100% fill + centered preserveAspectRatio.
                // AI-generated visuals use inconsistent width/height values (75%, 100%, px).
                // viewBox + preserveAspectRatio="xMidYMid meet" ensures content is always
                // centered within the SVG's drawing area regardless of original dimensions.
                const normalized = unique.replace(
                    /<svg\b([^>]*)>/g,
                    (_, attrs) => {
                        const cleaned = attrs
                            .replace(/\s*\bwidth="[^"]*"/g, '')
                            .replace(/\s*\bheight="[^"]*"/g, '')
                            .replace(/\s*\bpreserveAspectRatio="[^"]*"/g, '');
                        return `<svg${cleaned} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`;
                    }
                );

                setSnapshot(normalized);
                hasCaptured.current = true;
            });
        });

        return () => {
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
        };
    }, [Component, isActive]);

    // isActive=false with snapshot: zero motion nodes, pure static SVG markup
    if (!isActive && snapshot) {
        return (
            <div
                className="w-full h-full"
                dangerouslySetInnerHTML={{ __html: snapshot }}
            />
        );
    }

    // Active, or snapshot not yet captured: render full animated component
    if (Component) {
        return (
            <div ref={containerRef} className="w-full h-full">
                <Component isActive={isActive} />
            </div>
        );
    }

    // Fallback to AlchemyVisual if no code or compilation failed
    return <AlchemyVisual element={fallbackElement} isActive={isActive} />;
});
