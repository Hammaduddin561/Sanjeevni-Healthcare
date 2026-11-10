import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Sphere, MeshDistortMaterial } from '@react-three/drei';
// @ts-ignore
import * as random from 'maath/random/dist/maath-random.esm';

function Particles() {
    const ref = useRef<any>(null);
    // @ts-ignore
    const [sphere] = useState(() => random.inSphere(new Float32Array(600), { radius: 1.2 })); // Reduced from 3000

    useFrame((_state, delta) => {
        if (ref.current) {
            ref.current.rotation.x -= delta / 15;
            ref.current.rotation.y -= delta / 20;
        }
    });

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={sphere} stride={3} frustumCulled={false}>
                <PointMaterial
                    transparent
                    color="#0d9488" // clinical-teal-600
                    size={0.003}
                    sizeAttenuation={true}
                    depthWrite={false}
                />
            </Points>
        </group>
    );
}

function AnimatedCore() {
    const meshRef = useRef<any>(null);

    useFrame((state) => {
        if (meshRef.current) {
            const t = state.clock.getElapsedTime();
            meshRef.current.rotation.y = t * 0.2;
            meshRef.current.position.y = Math.sin(t / 1.5) / 10;
        }
    });

    return (
        <Sphere ref={meshRef} args={[0.8, 32, 32]} scale={[0.8, 0.8, 0.8]}>
            <MeshDistortMaterial
                color="#2dd4bf" // clinical-teal-400
                attach="material"
                distort={0.4}
                speed={1.5}
                roughness={0}
                transparent
                opacity={0.3}
            />
        </Sphere>
    );
}

export default function DigitalTwinModel() {
    return (
        <div className="w-full h-full relative">
            <Canvas camera={{ position: [0, 0, 3], fov: 60 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <Particles />
                <AnimatedCore />
            </Canvas>

            {/* Overlay Text inside the canvas area if needed, or strictly just graphics */}
            <div className="absolute inset-x-0 bottom-4 text-center pointer-events-none">
                <p className="text-xs text-clinical-teal/60 font-mono tracking-widest uppercase">System Idle • Waiting for Input</p>
            </div>
        </div>
    );
}
