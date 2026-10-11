import { NextResponse } from "next/server";
import { InputError, parseGame, parseQuery } from "@/features/games/model";
import { requireAdmin } from "@/lib/auth";
import { listGames, saveGame } from "@/lib/games";
import { apiError, assertOrigin, readGameForm } from "@/lib/http";
import { removeCover, storeCover } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return NextResponse.json(
      listGames(parseQuery(new URL(request.url).searchParams)),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  let coverKey: string | undefined;
  try {
    await requireAdmin();
    assertOrigin(request);
    const form = await readGameForm(request);
    const input = parseGame(Object.fromEntries(form));
    const cover = form.get("cover");
    if (!(cover instanceof File) || !cover.size)
      throw new InputError("请上传桌游封面", { cover: "请选择封面图片" });
    coverKey = await storeCover(cover);
    const game = saveGame(input, coverKey);
    return NextResponse.json(game, { status: 201 });
  } catch (error) {
    if (coverKey) await removeCover(coverKey);
    return apiError(error);
  }
}
