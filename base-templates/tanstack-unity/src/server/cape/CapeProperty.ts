import type { ICapeFile } from '~/interfaces/cape/ICapeData.ts';

export class CapeProperty {
  value: unknown;

  constructor(value: unknown) {
    this.value = value;
  }

  asString(fallback = ''): string {
    return typeof this.value === 'string' ? this.value : fallback;
  }

  asNumber(fallback = 0): number {
    return typeof this.value === 'number' ? this.value : fallback;
  }

  asBoolean(fallback = false): boolean {
    return typeof this.value === 'boolean' ? this.value : fallback;
  }

  asType<T>(): T | undefined {
    return this.value !== undefined ? (this.value as T) : undefined;
  }

  asArray<T>(): Array<T> {
    return Array.isArray(this.value) ? (this.value as Array<T>) : [];
  }

  asFile(index = 0): ICapeFile | undefined {
    if (Array.isArray(this.value) && this.value.length) {
      const clampedIndex = Math.max(0, Math.min(index, this.value.length - 1));
      return this.value[clampedIndex] as ICapeFile;
    }
    if (this.value) {
      return this.value as ICapeFile;
    }
    return undefined;
  }
}
