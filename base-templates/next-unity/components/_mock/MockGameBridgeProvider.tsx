'use client';

/**
 * components/_mock/MockGameBridgeProvider.tsx
 *
 * Drop-in Unity stub for local development.
 * Wraps your game page content and — when NEXT_PUBLIC_GAME_MOCK=true —
 * replaces the real Unity canvas with a simple control panel that lets
 * you manually fire game events (load, start, end with a score).
 *
 * Usage in your game page:
 *
 *   import { MockGameBridgeProvider } from '@components/_mock/MockGameBridgeProvider';
 *
 *   export default function GamePage() {
 *     return (
 *       <MockGameBridgeProvider>
 *         <UnityCanvas />   ← only rendered when NEXT_PUBLIC_GAME_MOCK is NOT true
 *       </MockGameBridgeProvider>
 *     );
 *   }
 *
 * When NEXT_PUBLIC_GAME_MOCK=false (default) this component is a no-op
 * wrapper — it just renders its children unchanged.
 */

import { useEffect, useRef, useState } from 'react';
import { GameBridgeContext } from '@hooks/useGameBridge';
import type {
  IGameBridgeAdapter,
  IUnityInput,
  GameBridgeEventName,
  GameBridgeEventCallback,
} from '@lib/game-bridge/game-bridge.types';

const IS_MOCK = process.env.NEXT_PUBLIC_GAME_MOCK === 'true';

// ── Mock adapter ──────────────────────────────────────────────────────────────

type ListenerMap = Map<string, Set<GameBridgeEventCallback<unknown>>>;

/** Full IGameBridgeAdapter implementation backed by in-memory listeners. */
class MockBridgeAdapter implements IGameBridgeAdapter {
  private listeners: ListenerMap = new Map();

  /** Fire an event from the mock UI panel. Not part of IGameBridgeAdapter. */
  fire(event: string, data?: unknown) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  setData(_input: IUnityInput) {
    // Stored for reference in real usage; no-op in mock.
  }

  setTargetScene(_sceneKey: string) {
    // No-op — no real scene to load.
  }

  sendMessage(objectName: string, methodName: string, data?: string) {
    console.debug(`[MockBridge] sendMessage(${objectName}, ${methodName}${data ? `, ${data}` : ''})`);
  }

  on<T = unknown>(event: GameBridgeEventName, cb: GameBridgeEventCallback<T>) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb as GameBridgeEventCallback<unknown>);
  }

  off<T = unknown>(event: GameBridgeEventName, cb: GameBridgeEventCallback<T>) {
    this.listeners.get(event)?.delete(cb as GameBridgeEventCallback<unknown>);
  }

  waitFor<T = unknown>(event: GameBridgeEventName, timeoutMs = 10_000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`[MockBridge] waitFor("${event}") timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
      const handler: GameBridgeEventCallback<unknown> = (data) => {
        clearTimeout(timer);
        this.off(event, handler);
        resolve(data as T);
      };
      this.on(event, handler);
    });
  }

  async fullBoot() {
    // Simulate the real Unity boot sequence with realistic timing.
    await delay(150);  this.fire('loading', 0.2);
    await delay(250);  this.fire('loading', 0.5);
    await delay(200);  this.fire('loading', 0.8);
    await delay(150);  this.fire('loading', 1.0);
    await delay(100);  this.fire('sceneLoaded', { sceneKey: 'controller' });
    await delay(300);  this.fire('addressableLoaded');
    await delay(200);  this.fire('ready');
  }

  startGame() {
    this.fire('start');
  }

  destroy() {
    this.listeners.clear();
  }
}

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

// ── Component ─────────────────────────────────────────────────────────────────

type BootPhase = 'idle' | 'booting' | 'ready' | 'playing';

interface Props {
  children?: React.ReactNode;
}

/**
 * When NEXT_PUBLIC_GAME_MOCK=true: renders a mock game control panel
 * and provides a fake IGameBridgeAdapter via GameBridgeContext.
 *
 * When NEXT_PUBLIC_GAME_MOCK is not set / false: renders children unchanged.
 */
export function MockGameBridgeProvider({ children }: Props) {
  if (!IS_MOCK) return <>{children}</>;
  return <MockPanel />;
}

function MockPanel() {
  const adapterRef = useRef(new MockBridgeAdapter());
  const adapter    = adapterRef.current;

  const [phase,    setPhase]    = useState<BootPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [score,    setScore]    = useState(1337);

  useEffect(() => {
    adapter.on('loading',  (p: unknown)  => setProgress(Math.round((p as number) * 100)));
    adapter.on('ready',    ()            => { setPhase('ready'); setProgress(100); });
    adapter.on('start',    ()            => setPhase('playing'));

    setPhase('booting');
    adapter.fullBoot();

    return () => adapter.destroy();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStart() {
    adapter.startGame();
  }

  function handleEndGame() {
    // Unity fires the END payload as a JSON string — match that behaviour.
    adapter.fire('end', JSON.stringify({ score, playTime: 42_000 }));
  }

  function handleTutorialDone() {
    adapter.fire('tutorialPlayed');
  }

  return (
    <GameBridgeContext.Provider value={adapter}>
      <div style={styles.shell}>

        {/* Red "MOCK" badge — always visible so devs can't miss it */}
        <div style={styles.badge}>MOCK GAME</div>

        <div style={styles.card}>
          <div style={styles.icon}>🎮</div>

          <h2 style={styles.title}>Mock Game Bridge</h2>
          <p style={styles.subtitle}>
            Set <code>NEXT_PUBLIC_GAME_MOCK=false</code> to use a real Unity build.
          </p>

          {/* ── Loading bar ── */}
          {phase === 'booting' && (
            <div style={styles.loadWrap}>
              <span style={styles.loadLabel}>Loading… {progress}%</span>
              <div style={styles.trackOuter}>
                <div style={{ ...styles.trackInner, width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* ── Ready — waiting for StartGame ── */}
          {phase === 'ready' && (
            <button onClick={handleStart} style={btn('#2a9d5c')}>
              ▶ Start Game
            </button>
          )}

          {/* ── Game running — controls to fire events ── */}
          {phase === 'playing' && (
            <div style={styles.controls}>
              <p style={styles.subtitle}>Game is running…</p>

              <label style={styles.scoreLabel}>
                Score to submit:
                <input
                  type="number"
                  value={score}
                  onChange={e => setScore(Number(e.target.value))}
                  style={styles.scoreInput}
                />
              </label>

              <button onClick={handleEndGame} style={btn('#e94560')}>
                🏁 End Game &nbsp;(score: {score})
              </button>

              <button onClick={handleTutorialDone} style={btn('#555', 12)}>
                Skip tutorial
              </button>
            </div>
          )}
        </div>
      </div>
    </GameBridgeContext.Provider>
  );
}

// ── Inline styles (no Tailwind dependency) ────────────────────────────────────

const styles = {
  shell: {
    position:       'relative' as const,
    width:          '100%',
    minHeight:      '100svh',
    background:     '#0c0c18',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontFamily:     'monospace',
    color:          '#e0e0e0',
  },
  badge: {
    position:     'absolute' as const,
    top:          12,
    right:        12,
    background:   '#e94560',
    color:        '#fff',
    padding:      '4px 10px',
    borderRadius: 4,
    fontSize:     11,
    fontWeight:   700,
    letterSpacing: '0.08em',
  },
  card: {
    textAlign:  'center' as const,
    maxWidth:   360,
    padding:    32,
  },
  icon: {
    fontSize:     52,
    marginBottom: 8,
  },
  title: {
    margin:   '0 0 6px',
    fontSize: 20,
    color:    '#fff',
    fontWeight: 700,
  },
  subtitle: {
    margin:   '0 0 20px',
    fontSize: 13,
    color:    '#888',
    lineHeight: 1.5,
  },
  loadWrap: {
    marginBottom: 20,
  },
  loadLabel: {
    display:      'block' as const,
    fontSize:     12,
    color:        '#aaa',
    marginBottom: 8,
  },
  trackOuter: {
    width:        '100%',
    height:       4,
    background:   '#1e1e30',
    borderRadius: 2,
    overflow:     'hidden' as const,
  },
  trackInner: {
    height:     '100%',
    background: '#4a9eff',
    borderRadius: 2,
    transition: 'width 0.2s ease',
  },
  controls: {
    display:        'flex',
    flexDirection:  'column' as const,
    gap:            12,
    alignItems:     'center',
  },
  scoreLabel: {
    fontSize:   12,
    color:      '#888',
    display:    'flex',
    alignItems: 'center',
    gap:        8,
  },
  scoreInput: {
    width:        90,
    background:   '#1a1a2e',
    border:       '1px solid #444',
    color:        '#fff',
    padding:      '4px 8px',
    borderRadius: 4,
    fontFamily:   'monospace',
    fontSize:     13,
  },
} satisfies Record<string, React.CSSProperties>;

function btn(bg: string, fontSize = 14): React.CSSProperties {
  return {
    background:   bg,
    color:        '#fff',
    border:       'none',
    padding:      '10px 28px',
    borderRadius: 6,
    fontSize,
    fontFamily:   'monospace',
    cursor:       'pointer',
    fontWeight:   700,
    width:        '100%',
    maxWidth:     260,
  };
}
