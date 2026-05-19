import { mkdir, writeFile, readFile } from "fs/promises";
import { join, dirname } from "path";
import type { StorageDriver } from "./driver";

export class LocalDiskDriver implements StorageDriver {
  constructor(
    private readonly dir: string,
    private readonly baseUrl: string
  ) {}

  async upload(buffer: Buffer, key: string): Promise<string> {
    const filePath = join(this.dir, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    return key;
  }

  async getDownloadUrl(storageKey: string): Promise<string> {
    return `${this.baseUrl}/api/files/${encodeURIComponent(storageKey)}`;
  }

  async read(key: string): Promise<Buffer> {
    return readFile(join(this.dir, key));
  }
}
