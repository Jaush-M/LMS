export interface StorageDriver {
  upload(buffer: Buffer, key: string): Promise<string>;
  getDownloadUrl(storageKey: string): Promise<string>;
}
