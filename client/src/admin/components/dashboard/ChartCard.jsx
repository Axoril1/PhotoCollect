import { useState } from "react";
import { TrendingUp, RefreshCw, BarChart2 } from "lucide-react";
import SkeletonWidget from "./SkeletonWidget.jsx";
import EmptyWidget from "./EmptyWidget.jsx";

export function ChartCard({
  title,
  subtitle,
  seriesData = null, // Array<{ label: string, value: number }>
  isLoading = false,
  isError = false,
  chartType = "area", // "area" | "bar"
  color = "amber",
  onRefresh,
}) {
  const [selectedRange, setSelectedRange] = useState("30d");

  if (isLoading) {
    return <SkeletonWidget height="h-64" />;
  }

  if (isError) {
    return (
      <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl">
        <EmptyWidget title="Chart Rendering Error" message="Unable to load time-series visualization data." />
      </div>
    );
  }

  const isEmpty = !seriesData || seriesData.length === 0;

  // Color mappings for SVG chart strokes and area gradients
  const colorMap = {
    amber: {
      stroke: "#f59e0b",
      gradientStart: "rgba(245, 158, 11, 0.35)",
      gradientEnd: "rgba(245, 158, 11, 0.0)",
      bar: "bg-amber-500",
    },
    emerald: {
      stroke: "#10b981",
      gradientStart: "rgba(16, 185, 129, 0.35)",
      gradientEnd: "rgba(16, 185, 129, 0.0)",
      bar: "bg-emerald-500",
    },
    sky: {
      stroke: "#38bdf8",
      gradientStart: "rgba(56, 189, 248, 0.35)",
      gradientEnd: "rgba(56, 189, 248, 0.0)",
      bar: "bg-sky-500",
    },
    indigo: {
      stroke: "#6366f1",
      gradientStart: "rgba(99, 102, 241, 0.35)",
      gradientEnd: "rgba(99, 102, 241, 0.0)",
      bar: "bg-indigo-500",
    },
  };

  const theme = colorMap[color] || colorMap.amber;

  // Compute SVG viewBox points for area chart
  const renderSVGPath = () => {
    if (isEmpty) return null;

    const width = 500;
    const height = 180;
    const values = seriesData.map((d) => d.value);
    const maxVal = Math.max(...values, 1);
    const minVal = Math.min(...values, 0);

    const points = seriesData.map((d, idx) => {
      const x = (idx / (seriesData.length - 1 || 1)) * width;
      const y = height - ((d.value - minVal) / (maxVal - minVal || 1)) * (height - 20) - 10;
      return `${x},${y}`;
    });

    const pathData = `M 0,${height} L ${points.join(" L ")} L ${width},${height} Z`;
    const lineData = `M ${points.join(" L ")}`;

    return { pathData, lineData, pointsArray: points, width, height };
  };

  const svgCalculations = renderSVGPath();

  return (
    <div className="p-5 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-sm space-y-4">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <h4 className="font-display text-sm font-bold text-white tracking-tight">{title}</h4>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {/* Time Range Filter Buttons */}
          <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-xl">
            {["7d", "30d", "90d"].map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                  selectedRange === range
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Chart Canvas Area */}
      {isEmpty ? (
        <EmptyWidget
          icon={BarChart2}
          title="No Time-Series Data"
          message="Chart visualization will render when metric data becomes available."
        />
      ) : chartType === "bar" ? (
        <div className="h-44 flex items-end gap-2 pt-4 px-2">
          {seriesData.map((d, idx) => {
            const maxVal = Math.max(...seriesData.map((s) => s.value), 1);
            const heightPct = Math.max((d.value / maxVal) * 100, 4);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                <span className="text-[9px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {d.value}
                </span>
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full max-w-[28px] rounded-t-lg ${theme.bar} opacity-80 group-hover:opacity-100 transition-all shadow-sm`}
                />
                <span className="text-[10px] text-slate-500 truncate w-full text-center">
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="relative h-44 w-full pt-2">
          {svgCalculations && (
            <svg viewBox={`0 0 ${svgCalculations.width} ${svgCalculations.height}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.gradientStart} />
                  <stop offset="100%" stopColor={theme.gradientEnd} />
                </linearGradient>
              </defs>
              <path d={svgCalculations.pathData} fill={`url(#grad-${title})`} />
              <path d={svgCalculations.lineData} fill="none" stroke={theme.stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 px-1">
            <span>{seriesData[0]?.label}</span>
            <span>{seriesData[Math.floor(seriesData.length / 2)]?.label}</span>
            <span>{seriesData[seriesData.length - 1]?.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChartCard;
