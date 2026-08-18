try {
  const stored = localStorage.getItem("creed:theme");
  const dark = stored
    ? stored === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  const root = document.documentElement;
  root.classList.add(dark ? "dark" : "light");
  root.style.colorScheme = dark ? "dark" : "light";
} catch {
  // Some restricted browser contexts do not expose media queries.
}
