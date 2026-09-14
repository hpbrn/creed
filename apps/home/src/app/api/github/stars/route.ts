export async function GET() {
  try {
    const response = await fetch("https://api.github.com/repos/hpbrn/creed", {
      next: { revalidate: 3600 },
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) throw new Error("GitHub unavailable");
    const data = (await response.json()) as { stargazers_count?: number };
    return Response.json({ stars: data.stargazers_count ?? null });
  } catch {
    return Response.json({ stars: null });
  }
}
