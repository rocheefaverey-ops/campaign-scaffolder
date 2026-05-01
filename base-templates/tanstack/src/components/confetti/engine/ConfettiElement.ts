import type { IConfettiConfig } from '~/components/confetti/engine/ConfettiEngine.ts';

export default class ConfettiElement {
  public config!: IConfettiConfig;
  public image!: HTMLImageElement;
  public x = 0;
  public y = 0;
  public vx = 0;
  public vy = 0;
  public angle = 0;
  public spin = 0;
  public wobblePhase = 0;
  public wobbleSpeed = 0;
  public wobbleAmplitude = 0;
  public progress = 0;
  public width = 0;
  public height = 0;
  public gravity = 0;
  public zIndex = 0;
  public alive = false;

  public init(canvas: HTMLCanvasElement, images: Array<HTMLImageElement>, config: IConfettiConfig) {
    this.config = config;
    this.alive = true;

    // Get some default values if not provided
    this.gravity = config.gravity || 1;
    this.wobbleAmplitude = config.wobble?.amplitude || 0;

    // Determine scale
    let scale = 1;
    if (config.scale) {
      scale = config.scale.min === config.scale.max ? config.scale.min : config.scale.min + Math.random() * (config.scale.max - config.scale.min);
    }

    // Based on scale, select which image index to use
    let imageIndex = 0;
    if (config.depthOfField) {
      if (scale >= config.depthOfField.farScaleMax) {
        imageIndex = 2;
      } else if (scale >= config.depthOfField.nearScaleMax) {
        imageIndex = 1;
      }
    }

    // Make sure the index is within bounds, if not, fallback to first image
    if (imageIndex >= images.length) {
      imageIndex = 0;
    }
    this.zIndex = imageIndex;

    // Assign image & update dimensions
    this.image = images[imageIndex];
    this.width = this.image.width * scale;
    this.height = this.image.height * scale;

    // Get device pixel ratio
    const dpr = Math.round(window.devicePixelRatio);

    // Set speed
    this.vy = (config.speed.min + Math.random() * (config.speed.max - config.speed.min)) * dpr;

    // Set optional properties
    if (config.drift) {
      this.vx = (config.drift.min + Math.random() * (config.drift.max - config.drift.min)) * dpr;
    } else {
      this.vx = 0;
    }

    if (config.spin) {
      this.spin = config.spin.min + Math.random() * (config.spin.max - config.spin.min);
    } else {
      this.spin = 0;
    }

    if (config.wobble) {
      this.wobblePhase = Math.random() * 2 * Math.PI;
      this.wobbleSpeed = config.wobble.speed.min + Math.random() * (config.wobble.speed.max - config.wobble.speed.min);
    } else {
      this.wobblePhase = 0;
      this.wobbleSpeed = 0;
    }

    this.x = Math.random() * canvas.width;
    this.y = -this.height;
  }

  public update(canvas: HTMLCanvasElement, deltaTime: number) {
    if (!this.alive) {
      return;
    }

    // Update values
    this.vy += this.gravity * deltaTime;
    this.x += this.vx * Math.sin(this.wobblePhase) * this.wobbleAmplitude * deltaTime;
    this.y += this.vy * deltaTime;
    this.wobblePhase += this.wobbleSpeed * deltaTime;
    this.angle += this.spin * deltaTime;

    // Update progress based on y position and canvas height and image height
    this.progress = Math.min((this.y + this.height) / (canvas.height + this.height), 1);

    // Check whether the confetti is off the screen
    if (this.y > canvas.height + this.height) {
      this.reset();
    }
  }

  public render(context: CanvasRenderingContext2D) {
    if (!this.alive) {
      return;
    }

    // Prepare the canvas
    context.save();

    // Apply shadow
    if (this.config.dropShadow) {
      context.shadowColor = 'rgba(0, 0, 0, 0.3)';
      context.shadowBlur = 4;
      context.shadowOffsetX = 2;
      context.shadowOffsetY = 2;
    }

    // Apply opacity based on progress if fadeOut is enabled
    if (this.config.fadeOut && this.progress >= this.config.fadeOut.startAt) {
      const fadeProgress = (this.progress - this.config.fadeOut.startAt) / (1 - this.config.fadeOut.startAt);
      context.globalAlpha = Math.max(1 - fadeProgress * (1 - this.config.fadeOut.targetOpacity), this.config.fadeOut.targetOpacity);
    }

    // Apply transformations & draw the image
    context.translate(this.x, this.y);
    context.rotate(this.angle);
    context.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);

    // Finalize the canvas
    context.restore();
  }

  public reset() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.spin = 0;
    this.wobblePhase = 0;
    this.wobbleSpeed = 0;
    this.alive = false;
  }
}
