// shadcn/ui chart primitives, adapted for recharts 3. ChartContainer sets
// per-series colors directly on its element as `--color-<key>` CSS variables (from the ChartConfig),
// so series fills/strokes reference `var(--color-foo)` and stay theme-aware.
import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { useReducedMotion, useSpring } from "motion/react";

import { cn } from "@/components/ui/utils";
import { chartTooltipPosition } from "@/lib/chart-tooltip-position";

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<"light" | "dark", string> }
  );
};

type ChartContextProps = {
  config: ChartConfig;
  containerRef: React.RefObject<HTMLDivElement | null>;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  initialDimension,
  chartHeight,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
  initialDimension?: { width: number; height: number };
  // Pixel height plus a measured width. Recharts only skips its
  // height:0 / overflow:visible shrink wrapper when BOTH axes are numbers;
  // that wrapper is what leaked SVGs into the connections page scroll.
  chartHeight?: number;
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;
  const boxRef = React.useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = React.useState(0);

  React.useLayoutEffect(() => {
    if (chartHeight == null) return;
    const box = boxRef.current;
    if (!box) return;
    const update = () => {
      const next = Math.round(box.clientWidth);
      setChartWidth((current) => (current === next ? current : next));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(box);
    return () => observer.disconnect();
  }, [chartHeight]);

  const sized = chartHeight != null && chartWidth > 0;

  return (
    <ChartContext.Provider value={{ config, containerRef: boxRef }}>
      <div
        ref={boxRef}
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "[color-scheme:light] dark:[color-scheme:dark]",
          "flex min-h-0 min-w-0 justify-center overflow-hidden text-[12px] [&_.recharts-cartesian-axis-tick_text]:fill-[var(--creed-text-tertiary)] [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-[var(--creed-border)] [&_.recharts-curve.recharts-tooltip-cursor]:stroke-[var(--creed-border)] [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-[var(--creed-border)] [&_.recharts-radial-bar-background-sector]:fill-[var(--creed-surface-raised)] [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-[var(--creed-surface-raised)] [&_.recharts-reference-line_[stroke='#ccc']]:stroke-[var(--creed-border)] [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          chartHeight == null && "aspect-video",
          className,
        )}
        style={{
          ...Object.fromEntries(
            Object.entries(config).flatMap(([key, item]) => {
              const color = item.theme
                ? `light-dark(${item.theme.light}, ${item.theme.dark})`
                : item.color;
              return color ? [[`--color-${key}`, color]] : [];
            }),
          ),
          ...(chartHeight != null
            ? { height: chartHeight, maxHeight: chartHeight }
            : null),
          ...style,
        }}
        {...props}
      >
        {chartHeight != null ? (
          sized ? (
            <RechartsPrimitive.ResponsiveContainer
              width={chartWidth}
              height={chartHeight}
            >
              {children}
            </RechartsPrimitive.ResponsiveContainer>
          ) : null
        ) : (
          <RechartsPrimitive.ResponsiveContainer
            initialDimension={initialDimension}
          >
            {children}
          </RechartsPrimitive.ResponsiveContainer>
        )}
      </div>
    </ChartContext.Provider>
  );
}

// Preserve the last cursor position during fade-out, even when Recharts clears
// its active axis coordinates. New hovers start at their own measured position.
function ChartTooltip({
  wrapperStyle,
  followCursor = false,
  ...props
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> & { followCursor?: boolean }) {
  const { containerRef } = useChart();
  const reducedMotion = useReducedMotion();
  const [ready, setReady] = React.useState(false);
  const x = useSpring(0, { stiffness: 700, damping: 38, mass: 0.5 });
  const y = useSpring(0, { stiffness: 700, damping: 38, mass: 0.5 });

  React.useEffect(() => {
    if (!followCursor) return;
    const container = containerRef.current;
    if (!container) return;
    let frame = 0;
    let pointer: { x: number; y: number } | undefined;
    let entering = true;
    let observedTooltip: HTMLElement | null = null;
    let maxX = 0;
    let maxY = 0;
    const paint = () => {
      if (!observedTooltip) return;
      const left = Math.max(0, Math.min(x.get(), maxX));
      const top = Math.max(0, Math.min(y.get(), maxY));
      observedTooltip.style.translate = `${left}px ${top}px`;
    };
    const stopX = x.on("change", paint);
    const stopY = y.on("change", paint);
    const update = () => {
      frame = 0;
      if (!pointer) return;
      const chart = container.querySelector<HTMLElement>(".recharts-wrapper");
      const tooltip = container.querySelector<HTMLElement>(".recharts-tooltip-wrapper");
      if (!chart || !tooltip) return;
      if (observedTooltip !== tooltip) {
        if (observedTooltip) observer.unobserve(observedTooltip);
        observer.observe(tooltip);
        observedTooltip = tooltip;
      }
      const bounds = chart.getBoundingClientRect();
      if (!tooltip.offsetWidth || !tooltip.offsetHeight) return;
      maxX = Math.max(0, bounds.width - tooltip.offsetWidth);
      maxY = Math.max(0, bounds.height - tooltip.offsetHeight);
      const next = chartTooltipPosition(
        pointer.x - bounds.left, pointer.y - bounds.top,
        bounds.width, bounds.height, tooltip.offsetWidth, tooltip.offsetHeight,
      );
      if (entering || reducedMotion) {
        x.jump(next.x);
        y.jump(next.y);
      } else {
        x.set(next.x);
        y.set(next.y);
      }
      entering = false;
      paint();
      setReady(true);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    const move = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      schedule();
    };
    const enter = (event: PointerEvent) => {
      entering = true;
      setReady(false);
      move(event);
    };
    const leave = () => {
      pointer = undefined;
      x.stop();
      y.stop();
      cancelAnimationFrame(frame);
      frame = 0;
    };
    container.addEventListener("pointerenter", enter);
    container.addEventListener("pointermove", move);
    container.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      stopX();
      stopY();
      x.stop();
      y.stop();
      container.removeEventListener("pointermove", move);
      container.removeEventListener("pointerenter", enter);
      container.removeEventListener("pointerleave", leave);
    };
  }, [containerRef, followCursor, reducedMotion, x, y]);

  return (
    <RechartsPrimitive.Tooltip
      animationDuration={400}
      animationEasing="ease"
      useTranslate3d
      position={followCursor ? { x: 0, y: 0 } : undefined}
      wrapperStyle={{
        visibility: "visible",
        pointerEvents: "none",
        ...wrapperStyle,
        ...(followCursor ? {
          visibility: ready ? "visible" : "hidden",
          transform: "none",
          transition: "none",
        } : {}),
      }}
      {...props}
    />
  );
}

type TooltipPayloadItem = {
  name?: string | number;
  value?: number | string;
  dataKey?: string | number;
  color?: string;
  payload?: Record<string, unknown> & { fill?: string };
};

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  formatter,
  color,
  nameKey,
  labelKey,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  className?: string;
  indicator?: "line" | "dot" | "dashed";
  hideLabel?: boolean;
  hideIndicator?: boolean;
  label?: unknown;
  labelFormatter?: (
    value: unknown,
    payload: TooltipPayloadItem[],
  ) => React.ReactNode;
  formatter?: (
    value: unknown,
    name: string,
    item: TooltipPayloadItem,
    index: number,
    payload: unknown,
  ) => React.ReactNode;
  color?: string;
  nameKey?: string;
  labelKey?: string;
}) {
  const { config } = useChart();

  // Recharts unmounts the tooltip content the instant the cursor leaves, so a
  // CSS exit animation has nothing to play on. We retain the last payload to keep
  // the box mounted and drive its opacity off `active`, so it fades out smoothly
  // instead of blinking away. The ChartTooltip wrapper forces the recharts
  // wrapper visible (its own visibility:hidden would otherwise clip the fade).
  const lastPayloadRef = React.useRef<TooltipPayloadItem[] | undefined>(
    undefined,
  );
  const lastLabelRef = React.useRef<unknown>(undefined);
  if (active && payload?.length) {
    lastPayloadRef.current = payload;
    lastLabelRef.current = label;
  }
  const renderPayload =
    active && payload?.length ? payload : lastPayloadRef.current;
  const renderLabel = active && payload?.length ? label : lastLabelRef.current;

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !renderPayload?.length) {
      return null;
    }
    const [item] = renderPayload;
    const key = `${labelKey || item?.dataKey || item?.name || "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value =
      !labelKey && typeof renderLabel === "string"
        ? config[renderLabel]?.label || renderLabel
        : itemConfig?.label;

    if (labelFormatter) {
      return (
        <div className="font-medium text-[var(--creed-text-primary)]">
          {labelFormatter(value, renderPayload)}
        </div>
      );
    }
    if (!value) {
      return null;
    }
    return (
      <div className="font-medium text-[var(--creed-text-primary)]">
        {value}
      </div>
    );
  }, [renderLabel, labelFormatter, renderPayload, hideLabel, config, labelKey]);

  if (!renderPayload?.length) {
    return null;
  }

  const nestLabel = renderPayload.length === 1 && indicator !== "dot";

  return (
    <div
      className={cn(
        "grid min-w-[8rem] items-start gap-1.5 rounded-sm border border-[var(--creed-border)] bg-[var(--creed-surface)] px-2.5 py-2 text-[12px] shadow-[0_12px_32px_rgba(28,28,26,0.12)] animate-in fade-in-0 zoom-in-95 transition-[opacity,transform] duration-150 ease-out",
        active ? "opacity-100 scale-100" : "opacity-0 scale-95",
        className,
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {renderPayload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          const indicatorColor = color || item.payload?.fill || item.color;

          return (
            <div
              key={item.dataKey ?? index}
              className={cn(
                "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-[var(--creed-text-tertiary)]",
                indicator === "dot" && "items-center",
              )}
            >
              {formatter && item?.value !== undefined && item.name ? (
                formatter(
                  item.value,
                  String(item.name),
                  item,
                  index,
                  item.payload,
                )
              ) : (
                <>
                  {itemConfig?.icon ? (
                    <itemConfig.icon />
                  ) : (
                    !hideIndicator && (
                      <div
                        className={cn("shrink-0 rounded-[4px]", {
                          "h-2.5 w-2.5": indicator === "dot",
                          "w-1": indicator === "line",
                          "w-0 border-[1.5px] border-dashed bg-transparent":
                            indicator === "dashed",
                          "my-0.5": nestLabel && indicator === "dashed",
                        })}
                        style={
                          {
                            backgroundColor:
                              indicator === "dashed"
                                ? "transparent"
                                : indicatorColor,
                            borderColor: indicatorColor,
                          } as React.CSSProperties
                        }
                      />
                    )
                  )}
                  <div
                    className={cn(
                      "flex flex-1 justify-between leading-none",
                      nestLabel ? "items-end" : "items-center",
                    )}
                  >
                    <div className="grid gap-1.5">
                      {nestLabel ? tooltipLabel : null}
                      <span className="text-[var(--creed-text-primary)]">
                        {itemConfig?.label || item.name}
                      </span>
                    </div>
                    {item.value !== undefined && (
                      <span className="font-medium tabular-nums text-[var(--creed-text-primary)]">
                        {typeof item.value === "number"
                          ? item.value.toLocaleString()
                          : item.value}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

type LegendPayloadItem = {
  value?: string;
  dataKey?: string | number;
  color?: string;
};

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: {
  className?: string;
  hideIcon?: boolean;
  payload?: LegendPayloadItem[];
  verticalAlign?: "top" | "bottom";
  nameKey?: string;
}) {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className,
      )}
    >
      {payload.map((item) => {
        const key = `${nameKey || item.dataKey || "value"}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);

        return (
          <div
            key={String(item.value)}
            className="flex items-center gap-1.5 text-[12px] text-[var(--creed-text-secondary)] [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-[var(--creed-text-tertiary)]"
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-[4px]"
                style={{ backgroundColor: item.color }}
              />
            )}
            {itemConfig?.label ?? item.value}
          </div>
        );
      })}
    </div>
  );
}

function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string,
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? (payload.payload as Record<string, unknown>)
      : undefined;

  let configLabelKey: string = key;

  if (
    key in payload &&
    typeof (payload as Record<string, unknown>)[key] === "string"
  ) {
    configLabelKey = (payload as Record<string, unknown>)[key] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key] === "string"
  ) {
    configLabelKey = payloadPayload[key] as string;
  }

  return configLabelKey in config ? config[configLabelKey] : config[key];
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
};
