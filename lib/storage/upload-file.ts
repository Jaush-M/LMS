import type { PrismaClient } from "../generated/prisma/client";
import type { StorageDriver } from "./driver";
import type { FileCategory } from "./categories";
import { validateFileSize } from "./validate-file-size";

export interface UploadFileParams {
  buffer: Buffer;
  key: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  category: FileCategory;
  uploadedById: string;
}

export async function uploadFile(
  params: UploadFileParams,
  driver: StorageDriver,
  prisma: PrismaClient
) {
  validateFileSize(params.category, params.sizeBytes);

  const storageKey = await driver.upload(params.buffer, params.key);

  return prisma.fileAsset.create({
    data: {
      storageDriver: driver.constructor.name,
      storageKey,
      originalFilename: params.originalFilename,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      category: params.category,
      uploadedById: params.uploadedById,
    },
  });
}
