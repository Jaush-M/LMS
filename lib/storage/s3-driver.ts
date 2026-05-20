import type { StorageDriver } from "./driver";

export class S3Driver implements StorageDriver {
  async upload(_buffer: Buffer, _key: string): Promise<string> {
    void _buffer;
    void _key;
    throw new Error("S3 driver not yet implemented");
  }

  async getDownloadUrl(_storageKey: string): Promise<string> {
    void _storageKey;
    throw new Error("S3 driver not yet implemented");
  }
}
