import * as Phaser from 'phaser';

export interface IParsedColor {
  color: number;
  colorString: string;
  alpha: number;
}

export function linearInterpolation(norm: number, min: number, max: number): number {
  return (max - min) * norm + min;
}

export function mapRange(value: number, x1: number, y1: number, x2: number, y2: number): number {
  return ((value - x1) * (y2 - x2)) / (y1 - x1) + x2;
}

export function remapValue(value: number, low1: number, high1: number, low2: number, high2: number) {
  return low2 + ((value - low1) * (high2 - low2)) / (high1 - low1);
}

export function parseHexColor(color?: string): IParsedColor {
  let alpha = 1;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (color && color.length === 7) {
    const parsedColor = Phaser.Display.Color.HexStringToColor(color);
    red = parsedColor.red;
    green = parsedColor.green;
    blue = parsedColor.blue;
  } else if (color && color.length === 9) {
    const baseColor = color.substring(1);
    const parsedAlpha = parseInt(baseColor.substring(6, 8), 16);
    red = parseInt(baseColor.substring(0, 2), 16);
    green = parseInt(baseColor.substring(2, 4), 16);
    blue = parseInt(baseColor.substring(4, 6), 16);
    alpha = mapRange(parsedAlpha, 0, 255, 0, 1);
  }

  return {
    color: Phaser.Display.Color.GetColor(red, green, blue),
    colorString: Phaser.Display.Color.RGBToString(red, green, blue),
    alpha,
  };
}
