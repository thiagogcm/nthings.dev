// Client-only: renders the GitHub activity sparkline with Chart.js.
//
// Lives as a custom element so it initializes correctly even though its markup
// arrives late, injected by the StatusIsland `server:defer` island — the browser
// upgrades the element and fires connectedCallback whenever it enters the DOM.
// Chart.js is dynamically imported so it ships as a lazy chunk, loaded only once
// an actual chart appears.
import type { Chart as ChartInstance } from "chart.js";
import type { DailyActivity } from "@/lib/github-stats";

let chartLib: Promise<typeof import("chart.js")> | null = null;
function loadChartLib() {
  if (!chartLib) {
    chartLib = import("chart.js").then((mod) => {
      mod.Chart.register(
        mod.LineController,
        mod.LineElement,
        mod.PointElement,
        mod.LinearScale,
        mod.CategoryScale,
        mod.Filler,
        mod.Tooltip,
      );
      return mod;
    });
  }
  return chartLib;
}

function withAlpha(color: string, alpha: number) {
  const parts = color.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return color;
  const [r, g, b] = parts;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Dataset color props shared by the initial config and the theme-change update.
function datasetColors(colors: { line: string; fill: string }) {
  return {
    borderColor: colors.line,
    backgroundColor: colors.fill,
    pointHoverBackgroundColor: colors.line,
    pointHoverBorderColor: colors.line,
  };
}

class GithubActivityChart extends HTMLElement {
  #chart?: ChartInstance<"line">;
  #media?: MediaQueryList;
  #onThemeChange = () => this.#applyTheme();

  async connectedCallback() {
    if (this.#chart) return;

    const canvas = this.querySelector("canvas");
    if (!canvas) return;

    let series: DailyActivity[];
    try {
      series = JSON.parse(this.dataset.series ?? "[]");
    } catch {
      return;
    }
    if (!series.length) return;

    const { Chart } = await loadChartLib();
    // The element may have been disconnected while chart.js loaded.
    if (!this.isConnected || this.#chart) return;

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const colors = this.#readColors();

    this.#chart = new Chart(canvas, {
      type: "line",
      data: {
        labels: series.map((point) => point.date),
        datasets: [
          {
            data: series.map((point) => point.count),
            ...datasetColors(colors),
            borderWidth: 1.5,
            fill: "origin",
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: reduceMotion ? false : { duration: 350 },
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            padding: 8,
            titleFont: { family: colors.font },
            bodyFont: { family: colors.font },
            callbacks: {
              title: (items) => items[0]?.label ?? "",
              label: (item) => {
                const count = item.parsed.y;
                return `${count} contribution${count === 1 ? "" : "s"}`;
              },
            },
          },
        },
        scales: {
          x: { display: false },
          y: {
            display: true,
            beginAtZero: true,
            border: { display: false },
            ticks: { display: false },
            grid: { color: colors.grid, drawTicks: false },
          },
        },
      },
    });

    this.#media = matchMedia("(prefers-color-scheme: dark)");
    this.#media.addEventListener("change", this.#onThemeChange);
  }

  disconnectedCallback() {
    this.#media?.removeEventListener("change", this.#onThemeChange);
    this.#chart?.destroy();
    this.#chart = undefined;
  }

  // Colors come from CSS so they track the site's light/dark tokens; the fill is
  // derived from the line color, and `border-top-color` is a render-free slot for
  // the grid color (no border is actually drawn).
  #readColors() {
    const cs = getComputedStyle(this);
    const line = cs.color;
    return {
      line,
      fill: withAlpha(line, 0.16),
      grid: cs.borderTopColor,
      font: cs.fontFamily,
    };
  }

  #applyTheme() {
    if (!this.#chart) return;
    const colors = this.#readColors();
    Object.assign(this.#chart.data.datasets[0], datasetColors(colors));
    const yGrid = (
      this.#chart.options.scales?.y as { grid?: { color?: string } } | undefined
    )?.grid;
    if (yGrid) yGrid.color = colors.grid;
    this.#chart.update("none");
  }
}

if (!customElements.get("github-activity-chart")) {
  customElements.define("github-activity-chart", GithubActivityChart);
}
