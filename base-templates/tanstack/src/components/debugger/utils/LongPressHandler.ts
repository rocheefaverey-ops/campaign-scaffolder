export enum LongPressCorner {
  TOP_LEFT,
  TOP_RIGHT,
  BOTTOM_LEFT,
  BOTTOM_RIGHT,
}

export class LongPressHandler {
  private readonly corner: LongPressCorner;
  private readonly delay: number;
  private readonly threshold: number;

  // State
  private listener?: () => void;
  private timer?: NodeJS.Timeout;

  // Functions
  private readonly handlePointerDown: (event: PointerEvent) => void;
  private readonly handlePointerUp: () => void;

  // Flags
  public showPreview = false;

  constructor(corner = LongPressCorner.BOTTOM_RIGHT, delay = 5000, threshold = 64) {
    this.corner = corner;
    this.delay = delay;
    this.threshold = threshold;

    // Bind functions to ensure correct 'this' context
    this.handlePointerDown = this.onPointerDown.bind(this);
    this.handlePointerUp = this.onPointerUp.bind(this);
  }

  public init() {
    window.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointerup', this.handlePointerUp);
  }

  public destroy() {
    window.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointerup', this.handlePointerUp);
    this.setListener(undefined);
  }

  public setListener(listener?: () => void) {
    this.listener = listener;
  }

  public setPreview(element: HTMLElement) {
    element.style.width = `${this.threshold}px`;
    element.style.height = `${this.threshold}px`;

    // Set position based on corner
    switch (this.corner) {
      case LongPressCorner.TOP_LEFT:
        element.style.top = '0';
        element.style.left = '0';
        break;
      case LongPressCorner.TOP_RIGHT:
        element.style.top = '0';
        element.style.right = '0';
        break;
      case LongPressCorner.BOTTOM_LEFT:
        element.style.bottom = '0';
        element.style.left = '0';
        break;
      case LongPressCorner.BOTTOM_RIGHT:
        element.style.bottom = '0';
        element.style.right = '0';
        break;
    }
  }

  private onPointerDown(event: PointerEvent) {
    const { clientX, clientY } = event;
    const { innerWidth, innerHeight } = window;
    let inCorner = false;

    // Check if the pointer is in the specified corner
    switch (this.corner) {
      case LongPressCorner.TOP_LEFT:
        inCorner = clientX <= this.threshold && clientY <= this.threshold;
        break;
      case LongPressCorner.TOP_RIGHT:
        inCorner = clientX >= innerWidth - this.threshold && clientY <= this.threshold;
        break;
      case LongPressCorner.BOTTOM_LEFT:
        inCorner = clientX <= this.threshold && clientY >= innerHeight - this.threshold;
        break;
      case LongPressCorner.BOTTOM_RIGHT:
        inCorner = clientX >= innerWidth - this.threshold && clientY >= innerHeight - this.threshold;
        break;
    }

    // If in corner, start the timer
    if (inCorner) {
      this.timer = setTimeout(() => this.listener?.(), this.delay);
    }
  }

  private onPointerUp() {
    clearTimeout(this.timer);
  }
}
