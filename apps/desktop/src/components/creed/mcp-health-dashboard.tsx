import { Button } from "@/components/ui/button";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion } from "motion/react";
import {
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Check, ChevronDown } from "lucide-react";
import { useCreed } from "@/components/creed/creed-provider";
import { IntegrationGlyph } from "@/components/creed/brand";
import { StackedRoundedBar } from "@/components/creed/rounded-bar";
import { useAnimatedIconControls } from "@/components/creed/animated-icon-controls";
import { ChartColumnIcon } from "@/components/ui/chart-column";
import {
  SkeletonBar,
  SkeletonRing,
  SkeletonText,
} from "@/components/creed/loading-skeleton";
import {
  SECTION_ACCENT_MARK_FILL_CLASS,
  SECTION_ACCENT_MARK_SLOT_CLASS,
  SectionAccentMark,
} from "@/components/creed/section-accent-mark";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  DROPDOWN_CHEVRON_CLASS,
  DROPDOWN_CONTENT_CLASS,
  DROPDOWN_ITEM_CLASS,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SwapLabel } from "@/components/creed/swap-label";
import { filterMcpHealthSummary } from "@/lib/mcp-health-filter";
import {
  accentColorMap,
  resolveAccentKey,
  type AgentIconKind,
} from "@/lib/creed/creed-data";
import {
  getCachedMcpHealth,
  loadMcpHealth,
  type McpHealthRange,
  type McpHealthAgent as HealthAgent,
  type McpHealthDay as HealthDay,
  type McpHealthSummary as HealthSummary,
} from "@/components/creed/mcp-health-preload";
import { cn } from "@/components/ui/utils";

type Metric = "reads" | "directs" | "proposals";
type ChartMetric = Metric | "all";

const RANGES: { value: McpHealthRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "90d", label: "90d" },
  { value: "30d", label: "30d" },
  { value: "7d", label: "7d" },
];

const METRICS: { value: ChartMetric; label: string }[] = [
  { value: "reads", label: "Reads" },
  { value: "directs", label: "Directs" },
  { value: "proposals", label: "Proposals" },
  { value: "all", label: "All activity" },
];

const METRIC_COLOR: Record<Metric, string> = {
  reads: accentColorMap.stack,
  directs: accentColorMap["operating-principles"],
  proposals: accentColorMap.decisions,
};
const METRIC_LABEL: Record<Metric, string> = {
  reads: "Reads",
  directs: "Directs",
  proposals: "Proposals",
};
const METRIC_BY_AGENT: Record<Metric, keyof HealthDay> = {
  reads: "readsByAgent",
  directs: "directsByAgent",
  proposals: "proposalsByAgent",
};

// Proposal-outcome colors for the per-agent trust chart.
const OUTCOME_CONFIG: ChartConfig = {
  accepted: { label: "Accepted", color: "#16A34A" },
  rejected: { label: "Rejected", color: "#DC2626" },
  pending: { label: "Pending", color: "#3B82F6" },
};

// Stack order (bottom to top) for the outcomes chart, so StackedRoundedBar can
// round whichever segment is actually on top.
const OUTCOME_KEYS = ["accepted", "rejected", "pending"];

// Clean display names: known agents get their product name, anything else has
// its "-mcp-client" suffix stripped and is title-cased ("codex-mcp-client" →
// "Codex"; "my-bot" → "My Bot").
const AGENT_LABEL: Partial<Record<AgentIconKind, string>> = {
  claude: "Claude",
  claudecode: "Claude Code",
  codex: "Codex",
  chatgpt: "ChatGPT",
  cursor: "Cursor",
  devin: "Devin",
  grok: "Grok",
  grokbot: "Grok Bot",
  goose: "Goose",
  v0: "v0",
  opencode: "OpenCode",
  openclaw: "OpenClaw",
  hermes: "Hermes",
  factory: "Factory",
  manus: "Manus",
};

function cleanName(name: string) {
  const base = name
    .replace(/[-_\s]*mcp[-_\s]*client$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return base ? base.replace(/\b\w/g, (c) => c.toUpperCase()) : name;
}

function agentLabel(agent: HealthAgent) {
  return AGENT_LABEL[agent.icon] ?? cleanName(agent.name);
}

function formatDay(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function McpHealthDashboard({ active = true }: { active?: boolean }) {
  const { state } = useCreed();
  const [range, setRange] = useState<McpHealthRange>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [metric, setMetric] = useState<ChartMetric>("all");
  // Scope the client cache to the active Creed so switching Creeds never shows
  // the previous one's dashboard. Empty string = personal/active Creed.
  const creedKey = state.creedId ?? "";
  // Seed from the cache the shell preloads, so the dashboard renders instantly
  // when the data is already warm instead of flashing a loading state.
  const [summary, setSummary] = useState<HealthSummary | null>(() =>
    getCachedMcpHealth(range, creedKey),
  );
  const [loading, setLoading] = useState(
    () => !getCachedMcpHealth(range, creedKey),
  );
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef(summary);
  summaryRef.current = summary;

  // The Agents section's per-card "Logs" action fires this event with the
  // agent's client id; the dashboard focuses that agent and scrolls into view.
  useEffect(() => {
    function onFocusAgent(event: Event) {
      const detail = (event as CustomEvent<{ clientId?: string }>).detail;
      setAgentFilter(detail?.clientId ?? "all");
      // Align the dashboard's TOP with the container's top, not the container
      // bottom: the charts below load data and resize well after any fixed
      // frame budget, so a scroll-to-bottom target keeps going stale and lands
      // short. The section's top only depends on the (static) content above
      // it, so pinning it is immune to below-the-fold growth; the settle loop
      // still self-corrects if anything above does shift.
      const element = rootRef.current;
      const container = element?.closest(
        "[class*='overflow-y-auto']",
      ) as HTMLElement | null;
      if (!element || !container) return;
      // Clamped so an unreachable target still counts as "arrived" once the
      // container is scrolled as far as it can go.
      const targetTop = () =>
        Math.min(
          element.getBoundingClientRect().top -
            container.getBoundingClientRect().top +
            container.scrollTop,
          container.scrollHeight - container.clientHeight,
        );
      // Drive the animation by hand instead of scrollTo({behavior:"smooth"}):
      // the browser cancels its own smooth scroll whenever the charts' async
      // loads resize the layout mid-flight, which read as a stutter (or a
      // strand partway down). Setting scrollTop directly each frame can't be
      // cancelled, and re-reading the target each frame absorbs any layout
      // shift without restarting the motion.
      const DURATION_MS = 650;
      const easeInOut = (t: number) =>
        t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      let cancelled = false;
      const cancel = () => {
        // Never fight the user: any manual scroll input hands control back.
        cancelled = true;
        container.removeEventListener("wheel", cancel);
        container.removeEventListener("touchmove", cancel);
      };
      container.addEventListener("wheel", cancel, { passive: true });
      container.addEventListener("touchmove", cancel, { passive: true });
      const startTop = container.scrollTop;
      let start: number | null = null;
      const step = (now: number) => {
        if (cancelled) return;
        if (start === null) start = now;
        const progress = Math.min((now - start) / DURATION_MS, 1);
        container.scrollTop =
          startTop + (targetTop() - startTop) * easeInOut(progress);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          cancel();
        }
      };
      requestAnimationFrame(step);
    }
    window.addEventListener("creed:mcp-health-focus-agent", onFocusAgent);
    return () =>
      window.removeEventListener("creed:mcp-health-focus-agent", onFocusAgent);
  }, []);

  const mcpClientCount = state.mcpClients.filter(
    (client) => client.icon !== "cli",
  ).length;

  // Current sections from the live file, keyed by id, so coverage shows the
  // section's real name + accent (activity rows snapshot a stale name and
  // accent="custom" at edit time, which is why the donut was white with old
  // labels). Activity that maps to no current section is bucketed as "Other".
  const currentSectionById = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    state.sections.forEach((section) => {
      map.set(section.id, {
        name: section.name,
        color: accentColorMap[resolveAccentKey(section.accent)],
      });
    });
    return map;
  }, [state.sections]);

  useEffect(() => {
    if (!active) return;
    let live = true;
    // Show cached data immediately if we have it, then revalidate.
    const cached = getCachedMcpHealth(range, creedKey);
    if (cached) {
      setSummary(cached);
      setLoading(false);
    } else {
      // Keep the last chart up while a new range loads so the bars can
      // morph instead of flashing a skeleton. Only the first visit, with
      // nothing to show, uses the loading stage.
      setLoading((current) => current || summaryRef.current == null);
    }
    loadMcpHealth(range, creedKey, true)
      .then((health) => {
        if (live && health) {
          setSummary(health);
          setLoading(false);
        }
      })
      .catch(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
    // Re-fetch on range change, Creed switch, and whenever a new agent shows up.
  }, [active, range, creedKey, mcpClientCount]);

  // CLI usage is excluded because it has its own setup mode and status surface.
  const mcpOnlySummary = useMemo(() => {
    if (!summary) return summary;
    return filterMcpHealthSummary(summary);
  }, [summary]);
  const filteredSummary = mcpOnlySummary;

  // Keep the agent filter valid when the roster changes.
  useEffect(() => {
    if (
      agentFilter !== "all" &&
      filteredSummary &&
      !filteredSummary.agents.some((a) => a.clientId === agentFilter)
    ) {
      setAgentFilter("all");
    }
  }, [filteredSummary, agentFilter]);

  const selectedAgent = useMemo(
    () =>
      agentFilter === "all"
        ? null
        : (filteredSummary?.agents.find((a) => a.clientId === agentFilter) ??
          null),
    [filteredSummary, agentFilter],
  );

  // KPI values for the active agent filter.
  const view = useMemo(() => {
    if (!filteredSummary) return null;
    if (!selectedAgent) {
      const t = filteredSummary.totals;
      return {
        reads: t.reads,
        directs: t.directs,
        proposals: t.proposals,
        accepted: t.accepted,
        rejected: t.rejected,
        acceptRate: t.acceptRate,
      };
    }
    const resolved = selectedAgent.accepted + selectedAgent.rejected;
    return {
      reads: selectedAgent.reads,
      directs: selectedAgent.directs,
      proposals: selectedAgent.proposals,
      accepted: selectedAgent.accepted,
      rejected: selectedAgent.rejected,
      acceptRate: resolved > 0 ? selectedAgent.accepted / resolved : null,
    };
  }, [filteredSummary, selectedAgent]);

  // Hero chart: one area per selected metric (reads/directs/proposals, or all
  // three for "all"), over time. For "All agents" we plot the true daily totals
  // (always correct); for a specific agent we plot that agent's per-day
  // breakdown. We deliberately don't stack per-agent here because proposal /
  // direct attribution depends on the activity actor matching a client name,
  // which isn't guaranteed - the day totals are. Series are keyed by metric, so
  // the tooltip shows "Reads" / "Directs" / "Proposals", never a client id.
  const chart = useMemo(() => {
    const empty = {
      series: [] as { key: string; color: string }[],
      keys: [] as string[],
      data: [] as Record<string, number | string>[],
      config: {} as ChartConfig,
      total: 0,
      max: 0,
    };
    if (!filteredSummary) return empty;

    // Always keep the three series mounted so a metric filter can shrink
    // unused stacks to zero instead of remounting the bars.
    const metrics: Metric[] = ["reads", "directs", "proposals"];
    const visible = metric === "all" ? metrics : [metric];
    const series = metrics.map((m) => ({ key: m, color: METRIC_COLOR[m] }));
    const data = filteredSummary.days
      .map((day) => {
        const row: Record<string, number | string> = { date: day.date };
        for (const m of metrics) {
          const value = selectedAgent
            ? ((
                day[METRIC_BY_AGENT[m]] as Record<string, number> | undefined
              )?.[selectedAgent.clientId] ?? 0)
            : (day[m] ?? 0);
          row[m] = visible.includes(m) ? value : 0;
        }
        return row;
      })
      // Only plot days that actually have data (like the AI spend chart).
      .filter(
        (row) => visible.reduce((s, m) => s + Number(row[m] ?? 0), 0) > 0,
      );
    const config: ChartConfig = {};
    metrics.forEach((m) => {
      config[m] = { label: METRIC_LABEL[m], color: METRIC_COLOR[m] };
    });
    const total = data.reduce(
      (sum, row) => series.reduce((s, se) => s + Number(row[se.key] ?? 0), sum),
      0,
    );
    // Largest stacked daily total - used to set explicit y-headroom so the
    // tallest spike never clips against the top of the plot.
    const max = data.reduce(
      (m, row) =>
        Math.max(
          m,
          series.reduce((s, se) => s + Number(row[se.key] ?? 0), 0),
        ),
      0,
    );
    return {
      series,
      keys: series.map((entry) => entry.key),
      data,
      config,
      total,
      max,
    };
  }, [filteredSummary, metric, selectedAgent]);

  // Section coverage, scoped to the agent filter and remapped onto the user's
  // current sections (real name + colour). Activity whose section_id no longer
  // matches a current section is grouped into "Other".
  const OTHER_KEY = "__other__";
  const sections = useMemo(() => {
    if (!filteredSummary) return [];
    const buckets = new Map<
      string,
      { sectionId: string; sectionName: string; color: string; count: number }
    >();
    for (const section of filteredSummary.sections) {
      const count = selectedAgent
        ? (section.byAgent?.[selectedAgent.clientId] ?? 0)
        : section.count;
      if (count <= 0) continue;
      const current = currentSectionById.get(section.sectionId);
      const key = current ? section.sectionId : OTHER_KEY;
      const existing = buckets.get(key);
      if (existing) {
        existing.count += count;
      } else {
        buckets.set(key, {
          sectionId: key,
          sectionName: current ? current.name : "Other",
          color: current ? current.color : "var(--creed-text-tertiary)",
          count,
        });
      }
    }
    return [...buckets.values()].sort((a, b) => {
      if (a.sectionId === OTHER_KEY) return 1;
      if (b.sectionId === OTHER_KEY) return -1;
      return b.count - a.count;
    });
  }, [filteredSummary, selectedAgent, currentSectionById]);
  const sectionTotal = sections.reduce(
    (sum, section) => sum + section.count,
    0,
  );

  // Proposal outcomes over time, scoped to the agent filter - accepted /
  // rejected / pending per day (placed on the day the proposal was made).
  const outcomeData = useMemo(
    () =>
      (filteredSummary?.days ?? [])
        .map((day) => {
          const cid = selectedAgent?.clientId;
          return {
            date: day.date,
            accepted: cid
              ? (day.acceptedByAgent?.[cid] ?? 0)
              : (day.accepted ?? 0),
            rejected: cid
              ? (day.rejectedByAgent?.[cid] ?? 0)
              : (day.rejected ?? 0),
            pending: cid
              ? (day.pendingByAgent?.[cid] ?? 0)
              : (day.pending ?? 0),
          };
        })
        // Only plot days with proposal activity (like the AI spend chart).
        .filter((d) => d.accepted + d.rejected + d.pending > 0),
    [filteredSummary, selectedAgent],
  );
  const outcomeTotal = outcomeData.reduce(
    (sum, d) => sum + d.accepted + d.rejected + d.pending,
    0,
  );

  const metricLabel = METRICS.find((m) => m.value === metric)?.label ?? "Reads";
  // CLI activity cannot make the MCP setup state appear connected.
  const rawTotals = mcpOnlySummary?.totals;
  const isEmpty =
    !loading &&
    summary &&
    rawTotals &&
    rawTotals.agents === 0 &&
    rawTotals.proposals === 0 &&
    rawTotals.directs === 0 &&
    rawTotals.reads === 0;

  // Filter changes can shrink the charts. Clamp leftover scrollTop so the
  // page cannot sit past its content and show a blank region underneath.
  useLayoutEffect(() => {
    const element = rootRef.current;
    const container = element?.closest(
      "[data-connections-scroll]",
    ) as HTMLElement | null;
    if (!container) return;
    const clamp = () => {
      const max = Math.max(0, container.scrollHeight - container.clientHeight);
      if (container.scrollTop > max) {
        container.scrollTop = max;
      }
    };
    clamp();
    const observer = new ResizeObserver(clamp);
    observer.observe(container);
    if (element) observer.observe(element);
    return () => observer.disconnect();
  }, [
    range,
    agentFilter,
    metric,
    chart.total,
    outcomeTotal,
    sections.length,
    loading,
    isEmpty,
  ]);

  const chartFilterKey = `${range}-${agentFilter}-${metric}`;
  const panelFilterKey = `${range}-${agentFilter}`;

  return (
    <div ref={rootRef} className="mt-12 scroll-mt-8 md:scroll-mt-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-[16px] font-medium text-[var(--creed-text-primary)]">
          Health
        </h2>
        {/* min-w-0 lets the agent chip shrink and ellipsize its label instead
            of pushing the other chips off-screen on narrow viewports. */}
        <div className="flex min-w-0 max-w-full items-center gap-3 md:gap-4">
          <Dropdown
            trigger={selectedAgent ? agentLabel(selectedAgent) : "All agents"}
            triggerIcon={selectedAgent ? selectedAgent.icon : "all"}
            // The one chip with a long label: shrink and ellipsize instead of
            // pushing the sibling chips off-screen on mobile.
            triggerClassName="min-w-0 shrink"
            disabled={(filteredSummary?.agents.length ?? 0) === 0}
            items={[
              {
                key: "all",
                label: "All agents",
                icon: "all" as AgentIconKind,
              },
              ...(filteredSummary?.agents ?? []).map((agent) => ({
                key: agent.clientId,
                label: agentLabel(agent),
                icon: agent.icon,
              })),
            ]}
            selectedKey={agentFilter}
            iconSide="left"
            align="end"
            menuWidthClass="min-w-44"
            onSelect={(key) => {
              setAgentFilter(key);
              setActiveSection(null);
            }}
          />
          <Dropdown
            trigger={
              RANGES.find((option) => option.value === range)?.label ?? range
            }
            items={RANGES.map((option) => ({
              key: option.value,
              label: option.label,
            }))}
            selectedKey={range}
            onSelect={(key) => setRange(key as McpHealthRange)}
            menuWidthClass="min-w-28"
          />
        </div>
      </div>

      {isEmpty ? (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--creed-border)] bg-[var(--creed-surface)] px-6 py-12 text-center">
          <IntegrationGlyph
            kind="mcp"
            framed={false}
            className="mx-auto h-10 w-10 opacity-70"
          />
          <div className="mt-4 text-[15px] font-medium text-[var(--creed-text-primary)]">
            No MCP activity yet
          </div>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-[var(--creed-text-secondary)]">
            Connect an agent with the URL above. Once it reads your Creed,
            its activity shows up here.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              label="Direct edits"
              value={loading ? null : (view?.directs ?? 0).toLocaleString()}
            />
            <StatTile
              label="Reads"
              value={loading ? null : (view?.reads ?? 0).toLocaleString()}
            />
            <StatTile
              label="Proposals"
              value={loading ? null : (view?.proposals ?? 0).toLocaleString()}
            />
            <StatTile
              label="Accept rate"
              value={
                loading
                  ? null
                  : view?.acceptRate == null
                    ? "-"
                    : `${Math.round(view.acceptRate * 100)}%`
              }
            />
          </div>

          <div className="mt-4 rounded-xl border border-[var(--creed-border)] bg-[var(--creed-surface)] p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="text-[15px] font-medium text-[var(--creed-text-primary)]">
                Activity over time
              </div>
              <Dropdown
                trigger={metricLabel}
                items={METRICS.map((m) => ({ key: m.value, label: m.label }))}
                selectedKey={metric}
                onSelect={(key) => setMetric(key as ChartMetric)}
              />
            </div>
            <ChartStage
              height={240}
              stageKey={
                loading && !summary
                  ? "loading"
                  : chart.total > 0
                    ? "chart"
                    : `empty-${chartFilterKey}`
              }
              loading={<SkeletonBar className="h-[240px] w-full rounded-lg" />}
              empty={
                <ChartEmpty
                  label={
                    metric === "all"
                      ? "No activity recorded in this range yet."
                      : `No ${metricLabel.toLowerCase()} recorded in this range yet.`
                  }
                />
              }
            >
              <ChartContainer
                config={chart.config}
                className="w-full"
                chartHeight={240}
              >
                <BarChart
                  data={chart.data}
                  margin={{ left: 4, right: 4, top: 8, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={[0, Math.ceil(chart.max * 1.2) || 1]} />
                  <ChartTooltip
                    followCursor
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => formatDay(String(value))}
                      />
                    }
                  />
                  {chart.series.map((series) => (
                    <StackedRoundedBar
                      key={series.key}
                      dataKey={series.key}
                      stackId="stack"
                      fill={series.color}
                      orderedKeys={chart.keys}
                    />
                  ))}
                </BarChart>
              </ChartContainer>
            </ChartStage>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-[var(--creed-border)] bg-[var(--creed-surface)] p-5">
              <div className="text-[15px] font-medium text-[var(--creed-text-primary)]">
                Proposal outcomes
              </div>
              <ChartStage
                height={200}
                stageKey={
                  loading && !summary
                    ? "loading"
                    : outcomeTotal > 0
                      ? "chart"
                      : `empty-${panelFilterKey}`
                }
                loading={
                  <SkeletonBar className="h-[200px] w-full rounded-lg" />
                }
                empty={<ChartEmpty label="No proposals in this range yet." />}
              >
                <ChartContainer
                  config={OUTCOME_CONFIG}
                  className="w-full"
                  chartHeight={200}
                >
                  <BarChart
                    data={outcomeData}
                    margin={{ left: 4, right: 4, top: 8, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" hide />
                    <ChartTooltip
                      followCursor
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) => formatDay(String(value))}
                        />
                      }
                    />
                    <StackedRoundedBar
                      dataKey="accepted"
                      stackId="o"
                      fill="var(--color-accepted)"
                      orderedKeys={OUTCOME_KEYS}
                    />
                    <StackedRoundedBar
                      dataKey="rejected"
                      stackId="o"
                      fill="var(--color-rejected)"
                      orderedKeys={OUTCOME_KEYS}
                    />
                    <StackedRoundedBar
                      dataKey="pending"
                      stackId="o"
                      fill="var(--color-pending)"
                      orderedKeys={OUTCOME_KEYS}
                    />
                  </BarChart>
                </ChartContainer>
              </ChartStage>
            </div>

            <div className="min-w-0 rounded-xl border border-[var(--creed-border)] bg-[var(--creed-surface)] p-5">
              <div className="text-[15px] font-medium text-[var(--creed-text-primary)]">
                Section coverage
              </div>
              <ChartStage
                height={200}
                className="mt-2"
                stageKey={
                  loading && !summary
                    ? "loading"
                    : sections.length > 0
                      ? "chart"
                      : `empty-${panelFilterKey}`
                }
                loading={
                  <div className="flex h-full items-center gap-6">
                    <div className="flex h-[200px] w-[200px] shrink-0 items-center justify-center">
                      <SkeletonRing size={168} stroke={26} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      {[0, 1, 2, 3, 4].map((index) => (
                        <div
                          key={index}
                          className="flex h-[26px] items-center gap-2"
                        >
                          <span
                            className={SECTION_ACCENT_MARK_SLOT_CLASS}
                            aria-hidden="true"
                          >
                            <SkeletonBar
                              className={SECTION_ACCENT_MARK_FILL_CLASS}
                            />
                          </span>
                          <SkeletonBar className="h-[9px] w-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                }
                empty={<ChartEmpty label="No agent edits in this range yet." />}
              >
                <div className="flex h-full items-center gap-6">
                  <div
                    className="relative h-[200px] w-[200px] shrink-0"
                    onMouseLeave={() => setActiveSection(null)}
                  >
                    <ChartContainer
                      config={{}}
                      className="h-[200px] w-[200px]"
                      chartHeight={200}
                    >
                      <PieChart>
                        <Pie
                          data={sections}
                          dataKey="count"
                          nameKey="sectionName"
                          innerRadius={62}
                          outerRadius={92}
                          paddingAngle={2}
                          strokeWidth={0}
                          onMouseEnter={(_, index) => setActiveSection(index)}
                        >
                          {sections.map((section, index) => (
                            <Cell
                              key={section.sectionId}
                              fill={section.color}
                              fillOpacity={
                                activeSection === null ||
                                activeSection === index
                                  ? 1
                                  : 0.3
                              }
                              style={{ transition: "fill-opacity 160ms ease" }}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                      <span className="text-[22px] font-medium leading-none tracking-[-0.03em] text-[var(--creed-text-primary)]">
                        {activeSection !== null && sections[activeSection]
                          ? sections[activeSection].count
                          : sectionTotal}
                      </span>
                      <span className="mt-1 max-w-full truncate text-[12px] text-[var(--creed-text-tertiary)]">
                        {activeSection !== null && sections[activeSection]
                          ? sections[activeSection].sectionName
                          : "edits"}
                      </span>
                    </div>
                  </div>
                  <div
                    className="max-h-[200px] min-w-0 flex-1 space-y-1 overflow-y-auto pr-1 creed-scrollbar"
                    onMouseLeave={() => setActiveSection(null)}
                  >
                    {sections.map((section, index) => (
                      <div
                        key={section.sectionId}
                        onMouseEnter={() => setActiveSection(index)}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1 text-[13px] transition-colors duration-150",
                          activeSection === index
                            ? "bg-[var(--creed-surface-raised)]"
                            : "bg-transparent",
                        )}
                      >
                        <SectionAccentMark color={section.color} />
                        <span className="hidden truncate text-[var(--creed-text-primary)] sm:block">
                          {section.sectionName}
                        </span>
                        <span className="ml-auto shrink-0 tabular-nums text-[var(--creed-text-primary)]">
                          {section.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartStage>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const CHART_STAGE_EASE = [0.22, 1, 0.36, 1] as const;

// Fixed pixel height: Recharts ResponsiveContainer plus h-full/flex-1 can
// grow the connections page without bound. Overflow is clipped so a filter
// change cannot change card height.
function ChartStage({
  height,
  className,
  stageKey,
  loading,
  empty,
  children,
}: {
  height: number;
  className?: string;
  stageKey: string;
  loading: ReactNode;
  empty: ReactNode;
  children: ReactNode;
}) {
  const [hasPainted, setHasPainted] = useState(false);
  useLayoutEffect(() => {
    setHasPainted(true);
  }, []);
  const content =
    stageKey === "loading"
      ? loading
      : stageKey.startsWith("empty")
        ? empty
        : children;
  return (
    <div
      className={cn("relative mt-4 w-full overflow-hidden", className)}
      style={{ height, overflow: "hidden", contain: "layout paint" }}
    >
      <motion.div
        key={stageKey}
        initial={hasPainted ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: CHART_STAGE_EASE }}
        className="h-full w-full overflow-hidden"
        style={{ position: "absolute", inset: 0, overflow: "hidden" }}
      >
        {content}
      </motion.div>
    </div>
  );
}

function ChartEmpty({ label }: { label: string }) {
  const { iconRef, start, settle } = useAnimatedIconControls(
    120,
    undefined,
    1800,
  );
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-[13px] text-[var(--creed-text-tertiary)]"
      onMouseEnter={start}
      onMouseLeave={settle}
    >
      <ChartColumnIcon ref={iconRef} size={20} className="opacity-60" />
      <span className="font-medium opacity-60">{label}</span>
    </div>
  );
}

// Shared with the connections screen (agent-type filter), so the filter chip
// matches the All agents / timeframe dropdowns here pixel for pixel.
export function Dropdown({
  trigger,
  triggerIcon,
  items,
  selectedKey,
  onSelect,
  iconSide = "left",
  align,
  variant = "outline",
  menuWidthClass = "min-w-40",
  disabled = false,
  triggerClassName,
}: {
  trigger: string;
  triggerIcon?: AgentIconKind;
  items: {
    key: string;
    label: string;
    icon?: AgentIconKind;
    disabled?: boolean;
  }[];
  selectedKey: string;
  onSelect: (key: string) => void;
  iconSide?: "left" | "right";
  align?: "start" | "end";
  variant?: "outline" | "ghost";
  menuWidthClass?: string;
  disabled?: boolean;
  triggerClassName?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex h-8 max-w-full shrink-0 items-center gap-2 rounded-md px-3 text-[14px] font-normal text-[var(--creed-text-primary)] transition-colors duration-150 hover:bg-[var(--creed-surface-raised)] disabled:pointer-events-none disabled:opacity-60",
            variant === "outline"
              ? "border border-[var(--creed-border)] bg-[var(--creed-surface)]"
              : "-ml-1 text-[14px] font-medium text-[var(--creed-text-secondary)]",
            triggerClassName,
          )}
        >
          {triggerIcon ? (
            <IntegrationGlyph
              kind={triggerIcon}
              framed={false}
              className="h-4 w-4 shrink-0"
              assetClassName="h-4 w-4"
            />
          ) : null}
          {/* Long agent names (e.g. "Claude Code") must never wrap the chip
              onto two lines on mobile. SwapLabel eases the width the same way
              Copy / Copied does; overflow-hidden still clips if the row is
              tight. */}
          <SwapLabel
            value={trigger}
            options={items.map((item) => item.label)}
            className="min-w-0"
          />
          <ChevronDown className={DROPDOWN_CHEVRON_CLASS} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align ?? (iconSide === "right" ? "end" : "start")}
        className={cn(DROPDOWN_CONTENT_CLASS, menuWidthClass)}
      >
        {items.map((item) => (
          <DropdownMenuItem
            key={item.key}
            disabled={item.disabled}
            onSelect={() => onSelect(item.key)}
            className={cn(DROPDOWN_ITEM_CLASS, item.disabled && "opacity-50")}
          >
            {item.icon && iconSide === "left" ? (
              <IntegrationGlyph
                kind={item.icon}
                framed={false}
                className="h-5 w-5 shrink-0"
                assetClassName="h-5 w-5"
              />
            ) : null}
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.icon && iconSide === "right" ? (
              <IntegrationGlyph
                kind={item.icon}
                framed={false}
                className="h-5 w-5 shrink-0"
                assetClassName="h-5 w-5"
              />
            ) : null}
            {selectedKey === item.key ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-[var(--creed-text-primary)]" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatTile({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-[var(--creed-border)] bg-[var(--creed-surface)] p-4">
      <div className="text-[15px] font-medium text-[var(--creed-text-primary)]">
        {label}
      </div>
      <div className="mt-2 text-[28px] font-medium leading-none tracking-[-0.04em] text-[var(--creed-text-primary)]">
        {value == null ? <SkeletonText preset="fig28" width="w-14" /> : value}
      </div>
    </div>
  );
}
