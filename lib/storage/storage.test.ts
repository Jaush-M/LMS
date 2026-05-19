import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { mkdtemp, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { validateFileSize } from "./validate-file-size";
import { LocalDiskDriver } from "./local-driver";
import { uploadFile } from "./upload-file";
import type { StorageDriver } from "./driver";
import { prisma } from "../prisma";
import { S3Driver } from "./s3-driver";

const MB = 1024 * 1024;

describe("S3Driver", () => {
  it("upload throws 'not yet implemented'", async () => {
    const driver = new S3Driver();
    await expect(driver.upload(Buffer.from("x"), "key")).rejects.toThrow(
      /not yet implemented/
    );
  });

  it("getDownloadUrl throws 'not yet implemented'", async () => {
    const driver = new S3Driver();
    await expect(driver.getDownloadUrl("key")).rejects.toThrow(
      /not yet implemented/
    );
  });
});

describe("LocalDiskDriver", () => {
  it("writes buffer to configured directory and returns key", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lms-test-"));
    const driver = new LocalDiskDriver(dir, "http://localhost:3000");
    const buffer = Buffer.from("hello storage");
    const key = await driver.upload(buffer, "test-file.txt");
    const written = await readFile(join(dir, "test-file.txt"));
    expect(written.equals(buffer)).toBe(true);
    expect(key).toBe("test-file.txt");
  });

  it("getDownloadUrl returns URL containing the storage key", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lms-test-"));
    const driver = new LocalDiskDriver(dir, "http://localhost:3000");
    const url = await driver.getDownloadUrl("abc-uuid.pdf");
    expect(url).toBe("http://localhost:3000/api/files/abc-uuid.pdf");
  });
});

describe("uploadFile (integration)", () => {
  let uploadedById: string;
  let createdAssetIds: string[] = [];

  beforeAll(async () => {
    const account = await prisma.userAccount.findFirstOrThrow({
      where: { role: "SUPER_ADMINISTRATOR" },
    });
    uploadedById = account.id;
  });

  afterEach(async () => {
    if (createdAssetIds.length > 0) {
      await prisma.fileAsset.deleteMany({ where: { id: { in: createdAssetIds } } });
      createdAssetIds = [];
    }
  });

  it("creates FileAsset row with correct metadata after successful upload", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lms-test-"));
    const driver = new LocalDiskDriver(dir, "http://localhost:3000");
    const buffer = Buffer.from("assignment content");

    const asset = await uploadFile(
      {
        buffer,
        key: "sub-test.pdf",
        originalFilename: "my-submission.pdf",
        mimeType: "application/pdf",
        sizeBytes: buffer.length,
        category: "SUBMISSION",
        uploadedById,
      },
      driver,
      prisma
    );

    createdAssetIds.push(asset.id);

    expect(asset.originalFilename).toBe("my-submission.pdf");
    expect(asset.mimeType).toBe("application/pdf");
    expect(asset.sizeBytes).toBe(buffer.length);
    expect(asset.category).toBe("SUBMISSION");
    expect(asset.storageKey).toBe("sub-test.pdf");
    expect(asset.uploadedById).toBe(uploadedById);
    expect(asset.status).toBe("ACTIVE");
  });
});

describe("uploadFile", () => {
  it("rejects over-limit file without calling driver", async () => {
    const driver: StorageDriver = {
      upload: vi.fn().mockResolvedValue("key"),
      getDownloadUrl: vi.fn().mockResolvedValue("url"),
    };
    await expect(
      uploadFile(
        {
          buffer: Buffer.alloc(8 * MB + 1),
          key: "test.pdf",
          originalFilename: "test.pdf",
          mimeType: "application/pdf",
          sizeBytes: 8 * MB + 1,
          category: "CHAT_ATTACHMENT",
          uploadedById: "user-1",
        },
        driver,
        {} as any
      )
    ).rejects.toThrow(/8 MB/);
    expect(driver.upload).not.toHaveBeenCalled();
  });
});

describe("validateFileSize", () => {
  it("rejects CHAT_ATTACHMENT over 8 MB", () => {
    expect(() => validateFileSize("CHAT_ATTACHMENT", 8 * MB + 1)).toThrow(
      /8 MB/
    );
  });

  it("accepts CHAT_ATTACHMENT at exactly 8 MB", () => {
    expect(() => validateFileSize("CHAT_ATTACHMENT", 8 * MB)).not.toThrow();
  });

  it("rejects SUBMISSION over 25 MB", () => {
    expect(() => validateFileSize("SUBMISSION", 25 * MB + 1)).toThrow(/25 MB/);
  });

  it.each(["SUBMISSION", "CONTENT_ATTACHMENT", "ANNOUNCEMENT_ATTACHMENT"] as const)(
    "accepts %s at exactly 25 MB",
    (category) => {
      expect(() => validateFileSize(category, 25 * MB)).not.toThrow();
    }
  );
});
