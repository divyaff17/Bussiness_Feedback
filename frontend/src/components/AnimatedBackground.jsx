import { Canvas, useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

// Floating Orbs Component - subtle 3D background animation
const FloatingOrbs = ({ count = 50, colors = ['#667eea', '#764ba2', '#a5b4fc', '#c084fc'] }) => {
  const meshRef = useRef(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Create particle data
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        position: [
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 25,
          (Math.random() - 0.5) * 20 - 10
        ],
        speed: 0.1 + Math.random() * 0.3,
        offset: Math.random() * Math.PI * 2,
        scale: 0.3 + Math.random() * 0.7,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    return temp;
  }, [count, colors]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const time = state.clock.getElapsedTime();

    particles.forEach((particle, i) => {
      const { position, speed, offset, scale } = particle;
      
      // Gentle floating motion
      const x = position[0] + Math.sin(time * speed + offset) * 0.5;
      const y = position[1] + Math.cos(time * speed * 0.7 + offset) * 0.8;
      const z = position[2] + Math.sin(time * speed * 0.5 + offset) * 0.3;

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(scale * (0.8 + Math.sin(time * 0.5 + offset) * 0.2));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshBasicMaterial color="#667eea" transparent opacity={0.6} />
    </instancedMesh>
  );
};

// Glowing Ring Component
const GlowingRing = ({ position, scale, color, speed }) => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * speed * 0.3;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * speed * 0.2;
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <torusGeometry args={[1, 0.02, 16, 100]} />
      <meshBasicMaterial color={color} transparent opacity={0.3} />
    </mesh>
  );
};

// Animated Gradient Sphere
const GradientSphere = ({ position, size = 1 }) => {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.1;
      const scale = size * (1 + Math.sin(state.clock.getElapsedTime() * 0.5) * 0.1);
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="#667eea" transparent opacity={0.08} wireframe />
    </mesh>
  );
};

// Main Background Scene
const BackgroundScene = () => {
  return (
    <>
      {/* Ambient floating particles */}
      <FloatingOrbs count={60} />
      
      {/* Large decorative rings */}
      <GlowingRing position={[-8, 5, -15]} scale={3} color="#667eea" speed={0.5} />
      <GlowingRing position={[10, -3, -12]} scale={2.5} color="#764ba2" speed={0.3} />
      <GlowingRing position={[0, 8, -18]} scale={4} color="#a5b4fc" speed={0.4} />
      
      {/* Gradient spheres in background */}
      <GradientSphere position={[-12, -5, -20]} size={3} />
      <GradientSphere position={[15, 6, -25]} size={4} />
      <GradientSphere position={[0, -8, -22]} size={2.5} />
    </>
  );
};

// Canvas wrapper component
const AnimatedBackground = () => {
  return (
    <div 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        zIndex: 0,
        pointerEvents: 'none'
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 20], fov: 60 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <BackgroundScene />
      </Canvas>
      
      {/* CSS Gradient overlay for depth */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `
            radial-gradient(ellipse at 20% 20%, rgba(102, 126, 234, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(118, 75, 162, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(165, 180, 252, 0.08) 0%, transparent 70%)
          `,
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
