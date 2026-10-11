import { NextResponse } from "next/server";
import { InputError } from "@/features/games/model";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function assertOrigin(request: Request) {
  const expected =
    process.env.APP_ORIGIN ||
    (process.env.NODE_ENV === "production" ? "" : new URL(request.url).origin);
  if (!expected || request.headers.get("origin") !== expected)
    throw new HttpError(
      403,
      "INVALID_ORIGIN",
      "请求来源无效，请从本站重新操作",
    );
}

export async function readBody(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new InputError("请求内容不能为空");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new InputError("提交内容过大，请压缩封面或缩短文字后重试");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function readGameForm(request: Request) {
  const body = await readBody(request, 6 * 1024 * 1024);
  try {
    return await new Response(body, {
      headers: { "Content-Type": request.headers.get("content-type") || "" },
    }).formData();
  } catch {
    throw new InputError("表单格式无效，请重新提交");
  }
}

export function apiError(error: unknown) {
  if (error instanceof InputError)
    return NextResponse.json(
      { code: "INVALID_INPUT", message: error.message, fields: error.fields },
      { status: 400 },
    );
  if (error instanceof HttpError)
    return NextResponse.json(
      { code: error.code, message: error.message },
      { status: error.status },
    );
  console.error(
    "请求处理失败",
    error instanceof Error ? error.name : "UnknownError",
  );
  return NextResponse.json(
    { code: "INTERNAL_ERROR", message: "暂时无法完成操作，请稍后重试" },
    { status: 500 },
  );
}
