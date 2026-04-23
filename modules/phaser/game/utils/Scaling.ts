export default class Scaling {
  static GAME_BASE_WIDTH = 375;
  static GAME_BASE_HEIGHT = 667;
  static GAME_BASE_DIFF_HEIGHT = window.innerHeight / 667 > 1 ? window.innerHeight / 667 : 1;

  static GAME_WIDTH: number = 375;
  static GAME_HEIGHT: number = 667;
  static GAME_DIFF_RATIO = 1;

  static DPR: number = Scaling.getDevicePixelRatio();

  static updateResolutionRatio(parentWidth: number, parentHeight: number): void {
    const diff = Math.abs(parentWidth / parentHeight - Scaling.GAME_BASE_WIDTH / Scaling.GAME_BASE_HEIGHT);
    if (diff > 0.001) {
      Scaling.GAME_WIDTH = parentWidth;
      Scaling.GAME_HEIGHT = parentHeight;
    }
    const diffRatio = parentHeight / Scaling.GAME_BASE_HEIGHT;
    if (diffRatio > 1) {
      Scaling.GAME_DIFF_RATIO = diffRatio;
    }
  }

  static getDevicePixelRatio(): number {
    const params = new URLSearchParams(window.location.search);
    const forceDpr = params.get('dpr');
    if (forceDpr) return Math.floor(parseInt(forceDpr));
    return Math.floor(Math.min(window.devicePixelRatio, 3));
  }

  static getPixelsByDPR(px: number): number {
    return px * Scaling.DPR;
  }

  static getImagePath(filePath: string, extension: string, size = Scaling.DPR): string {
    return `images/${filePath}@${size}x.${extension}`;
  }
}
