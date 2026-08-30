import {
  component$,
  useSignal,
  useVisibleTask$,
  type NoSerialize,
  type QRL,
} from "@builder.io/qwik";

// Payload handed to a click handler when the user clicks a data point. `date`
// (YYYY-MM-DD) is attached to every data point by the dashboard so the drill-down
// knows which day to open regardless of chart type; the rest mirror ECharts'
// callback params for anything else a caller might want.
export interface ChartClickParams {
  date?: string;
  seriesName?: string;
  dataIndex: number;
  name: string;
  value: unknown;
}

interface ChartProps {
  // A ready-to-render ECharts option object, wrapped in `noSerialize` by the
  // caller. It's `noSerialize` because it may hold functions (e.g. a custom
  // `renderItem`) and, being client-only, must never cross Qwik's serialization
  // boundary. Kept opaque (`unknown` payload) so ECharts' heavy types and the
  // library choice don't leak out to callers.
  option: NoSerialize<unknown>;
  class?: string;
  onPointClick$?: QRL<(params: ChartClickParams) => void>;
}

/**
 * Client-only ECharts wrapper (Phase A2).
 *
 * Qwik resumes without re-running component code, so a charting library that
 * must touch the DOM has to initialize in the browser, never during SSR. All of
 * that lives in a single `useVisibleTask$`: the ECharts bundle is dynamically
 * imported (so it only ships on routes that use a chart), the instance is
 * created against the container, and it's disposed on cleanup.
 *
 * The library is wrapped here once so it can be swapped from this one file.
 * Option objects passed in must be plain (no inline functions) — use ECharts'
 * string-template formatters — so nothing ever needs to cross a serialization
 * boundary.
 */
export const Chart = component$<ChartProps>(
  ({ option, class: className, onPointClick$ }) => {
    const containerRef = useSignal<HTMLDivElement>();

    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(async ({ track, cleanup }) => {
      // Re-run whenever the option changes (e.g. new date range / fresh data).
      const opt = track(() => option);
      const el = containerRef.value;
      if (!el) return;

      const echarts = await import("echarts");
      const chart = echarts.init(el, null, { renderer: "canvas" });
      // `true` clears any prior option so stale series never linger.
      chart.setOption(opt as Parameters<typeof chart.setOption>[0], true);

      if (onPointClick$) {
        chart.on("click", (params: { data?: unknown } & Record<string, unknown>) => {
          const data = params.data as { date?: string } | undefined;
          onPointClick$({
            date: data?.date,
            seriesName: params.seriesName as string | undefined,
            dataIndex: params.dataIndex as number,
            name: params.name as string,
            value: params.value,
          });
        });
      }

      const resize = () => chart.resize();
      window.addEventListener("resize", resize);
      cleanup(() => {
        window.removeEventListener("resize", resize);
        chart.dispose();
      });
    });

    return <div ref={containerRef} class={className} />;
  },
);
