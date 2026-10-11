import { NextResponse } from "next/server";
import { parseGame } from "@/features/games/model";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getGame, saveGame } from "@/lib/games";
import { apiError, assertOrigin, HttpError, readGameForm } from "@/lib/http";
import { removeCover, storeCover } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const game = getGame((await context.params).id);
    if (!game) throw new HttpError(404, "NOT_FOUND", "这款桌游已不在收藏中");
    return NextResponse.json(game, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  let newCover: string | undefined;
  try {
    await requireAdmin();
    assertOrigin(request);
    const existing = getGame((await context.params).id);
    if (!existing)
      throw new HttpError(404, "NOT_FOUND", "这款桌游已不在收藏中");
    const form = await readGameForm(request);
    const input = parseGame(Object.fromEntries(form));
    const cover = form.get("cover");
    if (cover instanceof File && cover.size) newCover = await storeCover(cover);
    const game = saveGame(input, newCover ?? existing.coverKey, existing);
    if (newCover) await removeCover(existing.coverKey);
    return NextResponse.json(game);
  } catch (error) {
    if (newCover) await removeCover(newCover);
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    await requireAdmin();
    assertOrigin(request);
    const game = getGame((await context.params).id);
    if (!game) throw new HttpError(404, "NOT_FOUND", "这款桌游已不在收藏中");
    getDb().prepare("DELETE FROM games WHERE id = ?").run(game.id);
    await removeCover(game.coverKey);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
