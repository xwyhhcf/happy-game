import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { InputError } from "@/features/games/model";

export const mediaKeyPattern = /^[a-f0-9-]{36}(?:-thumb)?\.webp$/;

export async function storeCover(file: File) {
  if (file.size > 5 * 1024 * 1024 || file.size === 0)
    throw new InputError("封面请选择不超过 5 MB 的图片", {
      cover: "请选择不超过 5 MB 的 JPEG、PNG 或 WebP 图片",
    });
  const buffer = Buffer.from(await file.arrayBuffer());
  const image = sharp(buffer, { limitInputPixels: 20000000, animated: false });
  let metadata;
  try {
    metadata = await image.metadata();
  } catch {
    throw new InputError("封面无法识别，请更换 JPEG、PNG 或 WebP 图片");
  }
  if (!["jpeg", "png", "webp"].includes(metadata.format ?? ""))
    throw new InputError("封面仅支持 JPEG、PNG 或 WebP");
  const key = `${randomUUID()}.webp`;
  const directory = path.resolve(
    /* turbopackIgnore: true */ process.env.DATA_DIR || "./data",
    "uploads",
  );
  await mkdir(directory, { recursive: true });
  try {
    await writeFile(
      path.join(directory, key),
      await image
        .clone()
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer(),
    );
    await writeFile(
      path.join(directory, key.replace(".webp", "-thumb.webp")),
      await image
        .clone()
        .rotate()
        .resize({
          width: 600,
          height: 600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer(),
    );
  } catch (error) {
    await removeCover(key);
    throw error;
  }
  return key;
}

export async function removeCover(key: string) {
  if (!mediaKeyPattern.test(key)) return;
  const directory = path.resolve(
    /* turbopackIgnore: true */ process.env.DATA_DIR || "./data",
    "uploads",
  );
  for (const name of [key, key.replace(".webp", "-thumb.webp")]) {
    try {
      await unlink(path.join(directory, name));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT")
        console.error("封面文件清理失败");
    }
  }
}

export async function readCover(key: string) {
  if (!mediaKeyPattern.test(key)) return undefined;
  try {
    return await readFile(
      path.resolve(
        /* turbopackIgnore: true */ process.env.DATA_DIR || "./data",
        "uploads",
        key,
      ),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}
