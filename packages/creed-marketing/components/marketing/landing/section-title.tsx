import { cn } from "@creed/ui/utils";

// Static section title. The per-glyph blur-in lives only on the landing hero;
// below-hero titles render plainly (keeping the same
// flex-wrap line handling so multi-line and single-line headings lay out the
// same as before).
export function SectionTitle({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const lines = children.split("\n");
  const hasExplicitBreak = lines.length > 1;

  return (
    <h2
      className={cn(
        "flex flex-wrap",
        !hasExplicitBreak && "md:flex-nowrap",
        className,
      )}
    >
      {lines.map((line, lineIndex) => (
        <span
          key={`${line}-${lineIndex}`}
          className={
            hasExplicitBreak
              ? "basis-full whitespace-nowrap"
              : "basis-auto whitespace-normal md:whitespace-nowrap"
          }
        >
          {line}
        </span>
      ))}
    </h2>
  );
}
