import { UAParser } from 'ua-parser-js';

export interface IDeviceEntry {
  name: string;
  value: string;
}

export class DeviceDataHandler {
  private userAgentParser: UAParser = new UAParser();
  private entries: Array<IDeviceEntry> = [];

  public async init() {
    const system = await this.getDeviceSystem();
    const model = await this.getDeviceModel();
    const browser = await this.getDeviceBrowser();

    // Store entries
    this.addEntry('System', system);
    this.addEntry('Model', model);
    this.addEntry('Browser', browser);
  }

  public destroy() {
    this.entries = [];
  }

  public getEntries(): Array<IDeviceEntry> {
    return this.entries;
  }

  private addEntry(name: string, value: string): void {
    if (value) {
      this.entries.push({ name, value });
    }
  }

  private async getDeviceSystem(): Promise<string> {
    const os = await this.userAgentParser.getOS().withClientHints();
    const name = os.name ? os.name : '';
    const version = os.version ? ` ${os.version}` : '';
    return `${name}${version}`;
  }

  private async getDeviceModel(): Promise<string> {
    const device = await this.userAgentParser.getDevice().withClientHints();
    const vendor = device.vendor ? device.vendor : '';
    const model = device.model ? ` ${device.model}` : '';
    return `${vendor}${model}`;
  }

  private async getDeviceBrowser(): Promise<string> {
    const browser = await this.userAgentParser.getBrowser().withClientHints();
    const name = browser.name && typeof browser.name === 'string' ? browser.name : '';
    const version = browser.version ? ` ${browser.version}` : '';
    const type = browser.type ? ` (${browser.type})` : '';
    return `${name}${version}${type}`;
  }
}
