import { nativeRequest } from "@/lib/native/request";
export function fetchForCreed(
  creedId: string | undefined,
  input: string,
  init: RequestInit = {},
) {
  if (!creedId) return Promise.reject(new Error("A Creed must be selected."));
  const headers = new Headers(init.headers);
  headers.set("x-creed-id", creedId);
  return nativeRequest(input, { ...init, headers });
}
