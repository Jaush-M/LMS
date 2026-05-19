import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type UploadCategory =
  | "chat_attachment"
  | "assignment_submission"
  | "module_content"
  | "assignment_attachment"
  | "announcement_attachment"
  | "feedback_attachment";

export const uploadLimits: Record<UploadCategory, number> = {
  chat_attachment: 8 * 1024 * 1024,
  assignment_submission: 25 * 1024 * 1024,
  module_content: 25 * 1024 * 1024,
  assignment_attachment: 25 * 1024 * 1024,
  announcement_attachment: 25 * 1024 * 1024,
  feedback_attachment: 25 * 1024 * 1024,
};

export type StoredFile = {
  storageDriver: "LOCAL" | "S3";
  storageKey: string;
  sizeBytes: number;
};

export function assertUploadSize(category: UploadCategory, sizeBytes: number) {
  const limit = uploadLimits[category];

  if (sizeBytes > limit) {
    throw new Error(
      `File exceeds ${Math.round(limit / 1024 / 1024)} MB limit for ${category}`,
    );
  }
}

export async function storeLocalFile(
  category: UploadCategory,
  filename: string,
  bytes: Buffer,
): Promise<StoredFile> {
  assertUploadSize(category, bytes.byteLength);

  const root = process.env.LOCAL_STORAGE_ROOT ?? "./storage/uploads";
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageKey = `${category}/${Date.now()}-${crypto.randomUUID()}-${safeFilename}`;
  const target = path.join(root, storageKey);

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);

  return {
    storageDriver: "LOCAL",
    storageKey,
    sizeBytes: bytes.byteLength,
  };
}

export function getStorageDriver() {
  return process.env.FILE_STORAGE_DRIVER === "s3" ? "S3" : "LOCAL";
}
