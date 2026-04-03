'use client';

/**
 * [module: r3f]
 * Default R3F scene stub. Build your 3D scene here.
 * Uncomment Three.js imports once @react-three/fiber + @react-three/drei are installed.
 */

interface SceneProps {
  onReady?: () => void;
}

export default function Scene({ onReady }: SceneProps) {
  // useEffect(() => { onReady?.(); }, [onReady]);

  return (
    <>
      {/* <ambientLight intensity={0.5} /> */}
      {/* <mesh> */}
      {/*   <boxGeometry /> */}
      {/*   <meshStandardMaterial color="hotpink" /> */}
      {/* </mesh> */}
      <></>
    </>
  );
}
