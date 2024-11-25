export interface FileInfo {
  name: string;
  path: string;
  size: number;
  modifiedTime: string;
  etag: string;
  isDirectory: boolean;
  children?: FileInfo[];
} 