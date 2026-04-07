export interface ICapeFile {
  url: string;
  name: string;
  type: string; // MIME type, e.g. 'image/png'
}

export interface ICapeObject {
  [key: string]: ICapeValue;
}

export type ICapeValue =
  | string
  | number
  | boolean
  | ICapeFile
  | ICapeFile[]
  | ICapeObject
  | { value: string | number | boolean }
  | Array<ICapeValue>;

export interface ICapeSettings {
  branding: {
    themeColor?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    favicon?: ICapeFile[];
    fontFamily?: string;
    fontBrand?: ICapeFile[];
    fontCondensedBlack?: ICapeFile[];
    fontLight?: ICapeFile[];
    fontTertiary?: ICapeFile[];
  };
}

export interface ICapeHeader {
  enabled?: boolean;
  variant?: string;
  logo?: ICapeFile[];
  menuBtnBg?: ICapeFile[];
  menuIcon?: ICapeFile[];
}

export interface ICapeGeneral {
  meta?: {
    siteTitle?: { value: string };
    siteDescription?: { value: string };
  };
}

export interface ICapeData {
  settings?: ICapeSettings;
  header?: ICapeHeader;
  general?: ICapeGeneral;
  copy?: ICapeObject;
  files?: ICapeObject;
  [key: string]: unknown;
}
