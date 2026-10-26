export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    // FormData (photo uploads) sets its own multipart content type.
    headers: options?.body instanceof FormData ? options.headers : { "Content-Type": "application/json", ...options?.headers },
  });
  if (response.status === 204) return undefined as T;
  const result = await response.json();
  if (!response.ok)
    throw Object.assign(
      new Error(result.error || "No pudimos completar la operación."),
      { status: response.status },
    );
  return result;
}
