import { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Text, Environment } from '@react-three/drei';
import { Physics, RigidBody, RapierRigidBody } from '@react-three/rapier';
import type { R3FGameBridgeAdapter } from '@lib/game-bridge/r3f-adapter';
import type { IUnityInput } from '@lib/game-bridge/game-bridge.types';

// ── Config ────────────────────────────────────────────────────────────────────

const GAME_DURATION  = 30;
const MAX_BUBBLES    = 16;
const COLORS         = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#c77dff', '#ff9f1c'];

// difficulty(0→1) → spawn interval 0.6s → 0.2s
const spawnInterval  = (d: number) => Math.max(0.2, 0.6 - d * 0.4);
// difficulty(0→1) → bubble upward speed 3 → 8
const bubbleSpeed    = (d: number) => 3 + d * 5 + Math.random() * 1.5;
// difficulty(0→1) → lateral drift ±1.5 → ±3.5
const bubbleDrift    = (d: number) => (Math.random() - 0.5) * (3 + d * 5);
// difficulty(0→1) → radius 0.55 → 0.35  (smaller = harder to tap)
const bubbleRadius   = (d: number) => Math.max(0.35, 0.55 - d * 0.2);

// ── Types ─────────────────────────────────────────────────────────────────────

interface Bubble {
  id: number;
  position: [number, number, number];
  velocity: [number, number, number];
  color: string;
  radius: number;
}

interface SceneProps {
  bridge: R3FGameBridgeAdapter;
  gameData: IUnityInput;
}

// ── Scene root ────────────────────────────────────────────────────────────────

export default function Scene({ bridge }: SceneProps) {
  const [bubbles, setBubbles]   = useState<Bubble[]>([]);
  const [score, setScore]       = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [started, setStarted]   = useState(false);
  const [ended, setEnded]       = useState(false);

  const nextId       = useRef(0);
  const spawnTimer   = useRef(0);
  const timeLeftRef  = useRef(GAME_DURATION);
  const startTimeRef = useRef(0);
  const scoreRef     = useRef(0);
  const endedRef     = useRef(false);

  useEffect(() => {
    startTimeRef.current = performance.now();
    setStarted(true);
    // Seed 5 bubbles immediately at staggered heights so action starts right away
    setBubbles(Array.from({ length: 5 }, (_, i) => ({
      id:       nextId.current++,
      position: [(Math.random() - 0.5) * 4, -2 - i * 2.5, 0] as [number, number, number],
      velocity: [bubbleDrift(0), bubbleSpeed(0), 0] as [number, number, number],
      color:    COLORS[Math.floor(Math.random() * COLORS.length)],
      radius:   bubbleRadius(0),
    })));
  }, []);

  const endGame = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    const playTime = Math.round(performance.now() - startTimeRef.current);
    bridge.emit('end', { score: scoreRef.current, playTime });
  }, [bridge]);

  const removeBubble = useCallback((id: number) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
  }, []);

  const popBubble = useCallback((id: number, e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    removeBubble(id);
    scoreRef.current += 10;
    setScore(scoreRef.current);
  }, [removeBubble]);

  useFrame((_, delta) => {
    if (!started || endedRef.current) return;

    timeLeftRef.current -= delta;
    const t = timeLeftRef.current;

    if (t <= 0) {
      setTimeLeft(0);
      endGame();
      return;
    }

    setTimeLeft(t);

    const difficulty = (GAME_DURATION - t) / GAME_DURATION; // 0 → 1

    spawnTimer.current += delta;
    if (spawnTimer.current >= spawnInterval(difficulty)) {
      spawnTimer.current = 0;
      setBubbles(prev => {
        if (prev.length >= MAX_BUBBLES) return prev;
        return [...prev, {
          id:       nextId.current++,
          position: [(Math.random() - 0.5) * 4, -6, 0],
          velocity: [bubbleDrift(difficulty), bubbleSpeed(difficulty), 0],
          color:    COLORS[Math.floor(Math.random() * COLORS.length)],
          radius:   bubbleRadius(difficulty),
        }];
      });
    }
  });

  return (
    <>
      <color attach="background" args={['#0d0d1a']} />
      <Environment preset="city" />
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 5, 5]} intensity={1.5} />

      <Text position={[-2.8, 5.5, 0]} fontSize={0.45} color="#ffffff" anchorX="left">
        {`Score: ${score}`}
      </Text>
      <Text position={[2.8, 5.5, 0]} fontSize={0.45} color={timeLeft < 10 ? '#ff6b6b' : '#ffffff'} anchorX="right">
        {`${Math.ceil(timeLeft)}s`}
      </Text>

      <Physics gravity={[0, 0, 0]}>
        {bubbles.map(b => (
          <BubbleMesh key={b.id} bubble={b} onPop={popBubble} onExit={removeBubble} />
        ))}
      </Physics>
    </>
  );
}

// ── Bubble ────────────────────────────────────────────────────────────────────

function BubbleMesh({
  bubble,
  onPop,
  onExit,
}: {
  bubble: Bubble;
  onPop: (id: number, e: ThreeEvent<PointerEvent>) => void;
  onExit: (id: number) => void;
}) {
  const rigidRef = useRef<RapierRigidBody>(null);

  useFrame(() => {
    if (!rigidRef.current) return;
    if (rigidRef.current.translation().y > 7) onExit(bubble.id);
  });

  return (
    <RigidBody
      ref={rigidRef}
      colliders="ball"
      position={bubble.position}
      linearVelocity={bubble.velocity}
      linearDamping={0}
      angularDamping={0.5}
      restitution={0.85}
      friction={0.1}
      onPointerDown={(e) => { e.stopPropagation(); onPop(bubble.id, e as unknown as ThreeEvent<PointerEvent>); }}
    >
      <mesh>
        <sphereGeometry args={[bubble.radius, 24, 24]} />
        <meshStandardMaterial
          color={bubble.color}
          transparent
          opacity={0.85}
          roughness={0.1}
          metalness={0.2}
        />
      </mesh>
    </RigidBody>
  );
}
