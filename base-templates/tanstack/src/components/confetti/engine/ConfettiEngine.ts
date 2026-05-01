import ConfettiElement from '~/components/confetti/engine/ConfettiElement.ts';
import PreprocessEngine from '~/components/confetti/engine/PreprocessEngine.ts';

export interface IConfettiConfig {
  maxParticleCount: number;
  spawnRate: number;

  // Confetti props
  dropShadow?: boolean;
  gravity?: number;
  speed: { min: number; max: number };
  scale?: { min: number; max: number };
  drift?: { min: number; max: number };
  spin?: { min: number; max: number };
  wobble?: { amplitude: number; speed: { min: number; max: number } };
  depthOfField?: { nearScaleMax: number; farScaleMax: number; blurAmount: number };
  fadeOut?: { startAt: number; targetOpacity: number };
}

export default class ConfettiEngine {
  private readonly key: string;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D | null;
  private readonly particleConfig: IConfettiConfig;
  private readonly resizeObserver: ResizeObserver;

  private static imageMap: Map<string, Array<HTMLImageElement>> = new Map<string, Array<HTMLImageElement>>();
  private confettiElementList: Array<ConfettiElement> = [];

  private lastTime = 0;
  private spawnAccumulator = 0;
  private animateHandler = -1;
  private running = false;
  private ready = false;
  private delayTimer?: NodeJS.Timeout;

  constructor(key: string, canvas: HTMLCanvasElement, particleConfig: IConfettiConfig) {
    this.key = key;
    this.canvas = canvas;
    this.context = this.canvas.getContext('2d');
    this.particleConfig = particleConfig;

    // Setup resize observer to handle parent element size changes
    this.resizeObserver = new ResizeObserver(this.resize.bind(this));

    if (this.canvas.parentElement) {
      this.resizeObserver.observe(this.canvas.parentElement);
    } else {
      this.resize();
    }
  }

  public async init(images: Array<string>) {
    const preloadPromises = images.map((url) => this.loadImage(url));
    const loadedImages = await Promise.all(preloadPromises);
    const preprocessor = new PreprocessEngine(this.particleConfig);

    // Convert result to map, where each image filename is a key
    for (const image of loadedImages) {
      const fileName = `${this.key}_${this.getFileNameFromUrl(image.src)}`;
      const currentImages = ConfettiEngine.imageMap.get(fileName) || [];

      // Check if already processed
      if (!this.particleConfig.depthOfField && currentImages.length === 1 || this.particleConfig.depthOfField && currentImages.length > 1) {
        continue;
      }

      // Set original image as first in array
      const processed = [image];

      // Pre-process images for depth of field if configured
      if (this.particleConfig.depthOfField) {
        const result = await preprocessor.process(image);
        processed.push(...result);
      }

      // Add to map
      ConfettiEngine.imageMap.set(fileName, processed);
    }

    // Mark as ready
    this.ready = true;
  }

  public start(delay = 0) {
    if (this.running || !this.ready) {
      return;
    }

    // Setup base variables
    this.spawnAccumulator = this.particleConfig.spawnRate;
    this.running = true;

    // Begin
    if (delay > 0) {
      this.delayTimer = setTimeout(() => {
        this.lastTime = performance.now();
        this.render();
      }, delay);
    } else {
      this.lastTime = performance.now();
      this.render();
    }
  }

  private render() {
    if (!this.context) {
      throw new Error('Canvas context not available');
    }

    // Grab checked context
    const context = this.context;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Calculate delta time
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;

    // Check if we can spawn something
    this.spawnAccumulator += deltaTime;
    if (this.spawnAccumulator >= this.particleConfig.spawnRate) {
      const spawnCount = Math.floor(this.spawnAccumulator / this.particleConfig.spawnRate);
      this.spawnAccumulator -= spawnCount * this.particleConfig.spawnRate;

      for (let i = 0; i < spawnCount; i++) {
        let confettiElement = this.confettiElementList.find((element) => !element.alive);

        if (!confettiElement) {
          if (this.confettiElementList.length < this.particleConfig.maxParticleCount) {
            confettiElement = new ConfettiElement();
            this.confettiElementList.push(confettiElement);
          } else {
            break;
          }
        }

        const keyList = Array.from(ConfettiEngine.imageMap.keys()).filter((key) => key.startsWith(this.key));
        const randomKey = keyList[Math.floor(Math.random() * keyList.length)];
        confettiElement.init(this.canvas, ConfettiEngine.imageMap.get(randomKey) as Array<HTMLImageElement>, this.particleConfig);
      }
    }

    // Sort elements by their z-index, then update & render all elements
    this.confettiElementList
      .sort((a, b) => a.zIndex - b.zIndex)
      .forEach((confettiElement) => {
        confettiElement.update(this.canvas, deltaTime / 1000);
        confettiElement.render(context);
      });

    // Store time and request next frame
    this.lastTime = currentTime;
    this.animateHandler = requestAnimationFrame(this.render.bind(this));
  }

  public stop() {
    if (!this.running) {
      return;
    }

    // Clear delay timer
    clearTimeout(this.delayTimer);

    // Cancel animation frame
    cancelAnimationFrame(this.animateHandler);
    this.running = false;
  }

  public cleanUp() {
    this.stop();
    this.resizeObserver.disconnect();
    this.ready = false;
  }

  private resize() {
    const dpr = Math.round(window.devicePixelRatio);
    this.canvas.width = (this.canvas.parentElement?.clientWidth || window.innerWidth) * dpr;
    this.canvas.height = (this.canvas.parentElement?.clientHeight || window.innerHeight) * dpr;
  }

  private async loadImage(url: string) {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  }

  private getFileNameFromUrl(url: string): string {
    const pathname = new URL(url).pathname;
    const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
    return filename.replace(/\.[^/.]+$/, '');
  }
}
