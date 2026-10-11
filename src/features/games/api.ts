export class RequestError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string> = {},
    public status = 0,
  ) {
    super(message);
  }
}

export async function sendRequest<T>(
  url: string,
  options: RequestInit,
): Promise<T> {
  const response = await fetch(url, options);
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new RequestError(
      data?.message || "暂时无法完成操作，请稍后重试",
      data?.fields,
      response.status,
    );
  return data as T;
}
