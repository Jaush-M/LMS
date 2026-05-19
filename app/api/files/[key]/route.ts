import { prisma } from "@/lib/prisma";
import { LocalDiskDriver } from "@/lib/storage/local-driver";
import { env } from "@/lib/env";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const storageKey = decodeURIComponent(key);

  const asset = await prisma.fileAsset.findUnique({ where: { storageKey } });
  if (!asset || asset.status === "DELETED") {
    return new Response(null, { status: 404 });
  }

  const driver = new LocalDiskDriver(env.LOCAL_STORAGE_PATH, env.BETTER_AUTH_URL);
  let buffer: Buffer;
  try {
    buffer = await driver.read(storageKey);
  } catch {
    return new Response(null, { status: 404 });
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(asset.originalFilename)}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
