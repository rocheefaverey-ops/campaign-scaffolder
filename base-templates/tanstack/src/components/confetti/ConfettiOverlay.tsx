import { useEffect, useRef, useTransition } from 'react';
import styles from './ConfettiOverlay.module.scss';
import type { IConfettiConfig } from '~/components/confetti/engine/ConfettiEngine.ts';
import type { IStyledProps } from '~/interfaces/IComponentProps.ts';
import ConfettiEngine from '~/components/confetti/engine/ConfettiEngine.ts';
import { mergeClasses } from '~/utils/Helper.ts';

type VisualType = 'confetti';

interface IConfettiOverlay extends IStyledProps {
  config: IConfettiConfig;
  visual: VisualType;
  visualCount: number;
  startDelay?: number
}

// Import all confetti images
const images = import.meta.glob('../../assets/images/confetti/*.{png,jpg,svg}', { eager: true });

export function ConfettiOverlay({ config, visual, visualCount, startDelay = 0, className }: IConfettiOverlay) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [_, startTransition] = useTransition();

  // Setup
  useEffect(() => {
    const engine = new ConfettiEngine(visual, canvasRef.current!, config);

    // Build image list
    const imageList: Array<string> = [];
    const roundedDpr = Math.round(window.devicePixelRatio);

    for (let i = 1; i <= visualCount; i++) {
      for (const key in images) {
        const visualName = `${visual}${i}@${roundedDpr}x.png`;
        if (key.endsWith(visualName)) {
          imageList.push((images[key] as { default: string }).default);
        }
      }
    }

    // Start the engine
    startTransition(async () => {
      await engine.init(imageList);
      engine.start(startDelay);
    });

    // Cleanup on unmount
    return () => {
      engine.cleanUp();
    };
  }, []);

  return <canvas ref={canvasRef} className={mergeClasses(styles.confettiOverlay, className)} />;
}
