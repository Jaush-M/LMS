import {
  FileCategory,
  CATEGORY_SIZE_LIMITS,
  limitLabel,
} from "./categories";

export class FileSizeLimitError extends Error {
  constructor(
    public readonly category: FileCategory,
    public readonly limitBytes: number
  ) {
    super(
      `File exceeds the ${limitLabel(category)} size limit for ${category}`
    );
    this.name = "FileSizeLimitError";
  }
}

export function validateFileSize(
  category: FileCategory,
  sizeBytes: number
): void {
  const limit = CATEGORY_SIZE_LIMITS[category];
  if (sizeBytes > limit) {
    throw new FileSizeLimitError(category, limit);
  }
}
