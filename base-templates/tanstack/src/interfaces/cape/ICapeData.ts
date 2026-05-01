export interface ICapeData {
  copy?: ICapeObject;
  files?: ICapeObject;
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
