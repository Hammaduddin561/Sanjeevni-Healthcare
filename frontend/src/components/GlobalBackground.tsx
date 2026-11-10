import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Stars } from '@react-three/drei';
// @ts-ignore
import * as random from 'maath/random/dist/maath-random.esm';
// @ts-ignore
import { easing } from 'maath';

// Reusing ParticleCloud logic but adapted for global state
function ParticleCloud({ color, speed = 1 }: { color: string; speed?: number }) {
    const ref = useRef<any>(null);

    // Manual sphere generation to avoid NaN issues from maath
    const [sphere] = useState(() => {
        const count = 1500; // Restored to a richer count (was 200, originally ~5000)
        const radius = 1.5;
        const points = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            const r = Math.cbrt(Math.random()) * radius;
            const sinPhi = Math.sin(phi);
            points[i * 3] = r * sinPhi * Math.cos(theta);
            points[i * 3 + 1] = r * sinPhi * Math.sin(theta);
            points[i * 3 + 2] = r * Math.cos(phi);
        }
        return points;
    });

    useFrame((_state, delta) => {
        if (ref.current) {
            ref.current.rotation.x -= delta / 10 * speed;
            ref.current.rotation.y -= delta / 15 * speed;
        }
    });

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={sphere} stride={3} frustumCulled={false}>
                <PointMaterial
                    transparent
                    color={color}
                    size={0.005} // Slightly smaller for elegance with higher count
                    sizeAttenuation={true}
                    depthWrite={false}
                />
            </Points>
        </group>
    );
}

function CameraController({ mode }: { mode: 'story' | 'dashboard' }) {
    useFrame((state, delta) => {
        const targetZ = mode === 'dashboard' ? 0.2 : 3.5;
        const targetFov = mode === 'dashboard' ? 85 : 75;

        // Damp Z position for smooth "warp" feel
        // damp3(current, target, smoothTime, delta)
        easing.damp3(state.camera.position, [0, 0, targetZ], 0.4, delta);

        // Damp FOV for "speed" effect
        easing.damp(state.camera, 'fov', targetFov, 0.4, delta);
        state.camera.updateProjectionMatrix();
    });
    return null;
}

export default function GlobalBackground({ mode = 'story' }: { mode?: 'story' | 'dashboard' }) {
    // Mode-based colors
    const colors = {
        story: "#fb7185",     // rose-400
        dashboard: "#34d399", // emerald-400
    };

    // Smooth color transition
    const [currentColor, setCurrentColor] = useState(colors[mode]);

    useEffect(() => {
        // Simple instant transition for stability
        setCurrentColor(colors[mode]);
    }, [mode]);



    return (
        <div className="fixed inset-0 z-[-1] bg-slate-950">
            <Canvas
                camera={{ position: [0, 0, 3], fov: 75 }}
                dpr={[1, 1.5]} // Allow slight quality bump if possible, but keep low
                gl={{
                    powerPreference: "default",
                    failIfMajorPerformanceCaveat: true,
                    preserveDrawingBuffer: false
                }}
            >
                <ambientLight intensity={0.5} />
                <ParticleCloud color={currentColor} speed={1} />
                <Stars
                    radius={100}
                    depth={50}
                    count={3000} // Restored stars
                    factor={4}
                    saturation={0}
                    fade
                    speed={1}
                />
                <CameraController mode={mode} />
            </Canvas>

            {/* Noise Overlay */}
            <div className="absolute inset-0 z-[1] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScyNTAnIGhlaWdodD0nMjUwJz48ZmlsdGVyIGlkPSdub2lzZSc+PGZlVHVyYnVsZW5jZSB0eXBlPSdmcmFjdGFsTm9pc2UnIGJhc2VGcmVxdWVuY3k9JzAuNjUnIG51bXZvY3RhdmVzPSczJyBzdGl0Y2hUaWxlcz0nc3RpdGNoJy8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9JzEwMCUnIGhlaWdodD0nMTAwJScgZmlsdGVyPSd1cmwoI25vaXNlKScgb3BhY2l0eT0nMC4wNScvPjwvc3ZnPg==')] opacity-30 pointer-events-none mix-blend-overlay"></div>
        </div>
    );
}
