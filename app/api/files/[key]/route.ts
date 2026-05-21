import { prisma } from "@/lib/prisma";
import { LocalDiskDriver } from "@/lib/storage/local-driver";
import { env } from "@/lib/env";

// MIME types safe to display inline — anything that could execute (HTML, JS, SVG) stays as attachment.
const INLINE_SAFE = new Set([
  "application/pdf",
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/avif",
  "text/plain",
]);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const storageKey = decodeURIComponent(key);
  const preview = new URL(req.url).searchParams.get("preview") === "1";

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

  const inline = preview && INLINE_SAFE.has(asset.mimeType);
  const disposition = inline
    ? `inline; filename="${encodeURIComponent(asset.originalFilename)}"`
    : `attachment; filename="${encodeURIComponent(asset.originalFilename)}"`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Disposition": disposition,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
