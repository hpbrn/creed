import Image from "next/image";
import { Check, X } from "lucide-react";
import { cn } from "@creed/ui/utils";
import { SectionHeading } from "./section-heading";

const COMPARISON_PRODUCTS = [
  {
    name: "Creed",
    icon: "/assets/landing/comparison/creed.ico",
  },
  {
    name: "Supermemory",
    icon: "/assets/landing/comparison/supermemory.svg",
  },
  {
    name: "Obsidian",
    icon: "/assets/landing/comparison/obsidian.svg",
  },
  {
    name: "Notion",
    icon: "/assets/landing/comparison/notion.ico",
  },
] as const;

// Ticks are first-party product behaviour only: not community plugins,
// not Notion Lore, not "you could wire MCP to a folder." Columns are
// Creed, Supermemory, Obsidian, Notion.
const COMPARISON_ROWS = [
  {
    label: "You can read and edit it yourself",
    values: [true, true, true, true],
  },
  {
    label: "Every agent starts with your profile",
    values: [true, true, false, false],
  },
  {
    label: "One file you can actually read",
    values: [true, false, false, false],
  },
  {
    label: "You decide how agents write",
    values: [true, false, false, false],
  },
  {
    label: "You choose what agents can edit",
    values: [true, false, false, false],
  },
  {
    label: "Updates arrive as a diff",
    values: [true, false, false, false],
  },
] as const;

export function WhyNotOtherToolsSection() {
  return (
    <section className="px-6 py-24 md:px-10 md:py-30 lg:px-12">
      <SectionHeading
        headline="Why not other tools?"
        className="max-w-[64rem]"
      />

      <div className="mx-auto mt-14 max-w-4xl">
        <div className="overflow-x-auto rounded-lg border border-[var(--creed-border)]">
          <table className="w-full min-w-[38rem] table-fixed border-collapse text-left text-[14px] md:min-w-[44rem]">
            <colgroup>
              <col className="w-[38%] md:w-[44%]" />
              {COMPARISON_PRODUCTS.map((product) => (
                <col key={product.name} className="w-[15.5%] md:w-[14%]" />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-[var(--creed-border)] bg-[var(--creed-surface)]">
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-[16px] font-medium text-[var(--creed-text-primary)]"
                >
                  Native features
                </th>
                {COMPARISON_PRODUCTS.map((product) => (
                  <th
                    key={product.name}
                    scope="col"
                    className="px-4 py-3 text-center font-medium text-[var(--creed-text-primary)]"
                  >
                    <span
                      className="mx-auto flex size-9 items-center justify-center"
                    >
                      <Image
                        src={product.icon}
                        alt={product.name}
                        width={28}
                        height={28}
                        unoptimized
                        className={cn(
                          "h-7 w-auto max-w-7 object-contain",
                          product.name === "Supermemory" && "creed-invert-on-dark",
                        )}
                      />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-[var(--creed-border)] last:border-0"
                >
                  <th
                    scope="row"
                    className="px-4 py-3 text-left font-medium text-[var(--creed-text-primary)]"
                  >
                    {row.label}
                  </th>
                  {row.values.map((supported, index) => {
                    const product = COMPARISON_PRODUCTS[index];
                    return (
                      <td key={product.name} className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            "mx-auto inline-flex size-7 items-center justify-center",
                            supported
                              ? "text-[var(--creed-success)]"
                              : "text-[var(--creed-danger)]",
                          )}
                          aria-label={`${product.name}: ${supported ? "Yes" : "No"}`}
                        >
                          {supported ? (
                            <Check className="size-4" aria-hidden="true" />
                          ) : (
                            <X className="size-4" aria-hidden="true" />
                          )}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
