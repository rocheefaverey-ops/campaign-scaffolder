export interface ICapeData {
  copy?: ICapeObject;
  desktop?: ICapeObject;
  files?: ICapeObject;
  general?: ICapeObject;
  settings?: ICapeObject;
}

export interface ICapeObject {
  [key: string]: ICapeObject | any;
}

export interface ICapeFile {
  extension: string;
  title: string;
  url: string;
}
