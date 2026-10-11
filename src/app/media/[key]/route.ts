import { readCover } from "@/lib/media";
import { apiError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const buffer = await readCover((await params).key);
    if (!buffer) return new Response(null, { status: 404 });
    return new Response(buffer, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
