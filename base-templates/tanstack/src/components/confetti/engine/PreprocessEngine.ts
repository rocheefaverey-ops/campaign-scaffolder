import type { IConfettiConfig } from '~/components/confetti/engine/ConfettiEngine.ts';

export default class PreprocessEngine {
  private readonly canvas: OffscreenCanvas;
  private readonly context: OffscreenCanvasRenderingContext2D | null;
  private readonly config: IConfettiConfig;

  constructor(config: IConfettiConfig) {
    this.canvas = new OffscreenCanvas(0, 0);
    this.context = this.canvas.getContext('2d');
    this.config = config;
  }

  public async process(image: HTMLImageElement): Promise<Array<HTMLImageElement>> {
    if (!this.context) {
      console.error('Canvas context not available');
      return [];
    }

    if (!this.config.depthOfField) {
      console.error('Depth of field config not provided');
      return [];
    }

    // Calculate blur values
    const blurValues: Array<number> = [];
    blurValues.push(this.config.depthOfField.blurAmount * 0.5);
    blurValues.push(this.config.depthOfField.blurAmount);

    // Process images
    const output: Array<HTMLImageElement> = [];
    const dpr = Math.round(window.devicePixelRatio);

    for (const blur of blurValues) {
      const pad = Math.ceil(blur * 3);
      const w = image.width + pad * 2;
      const h = image.height + pad * 2;

      // Set canvas size
      this.canvas.width = w;
      this.canvas.height = h;

      // Clear the canvas
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Prepare the canvas
      this.context.save();

      // Apply blur and draw the image centered
      this.context.translate(w / 2, h / 2);
      this.context.filter = `blur(${blur * dpr}px)`;
      this.context.drawImage(image, -image.width / 2, -image.height / 2);

      // Finalize the canvas
      this.context.restore();

      // Create a new image from the canvas
      const blob = await this.canvas.convertToBlob();
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.src = url;
      await img.decode();
      URL.revokeObjectURL(url);
      output.push(img);
    }

    return output;
  }
}
