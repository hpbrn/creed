export function GET(request: Request) {
  const configured = process.env.CREED_DOWNLOAD_URL;
  if (!configured)
    return new Response("Download is not configured.", { status: 503 });
  const url = new URL(configured);
  if (url.protocol !== "https:")
    return new Response("Download is not configured.", { status: 503 });
  const release = new URL(request.url).searchParams.get("release");
  if (release) url.searchParams.set("release", release);
  return new Response(null, {
    status: 307,
    headers: {
      "Cache-Control": "no-store",
      Location: url.href,
    },
  });
}
