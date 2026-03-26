import React, { useMemo } from "react";
import { STAGES, getStagePct, estimateEndDate, COLOR_MAP } from "./projectStages";
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { TrendingUp } from "lucide-react";

const BAR_COLORS = {
  blue: "#3b82f6",
  purple: "#a855f7",
  green: "#22c55e",
  orange: "#f97316",
  pink: "#ec4899",
  teal: "#14b8a6",
  indigo: "#6366f1",
  red: "#ef4444",
};

export default function ClientProjectGantt({ projects }) {
  const activeProjects = projects.filter(p => p.start_date);

  const { minDate, maxDate } = useMemo(() => {
    if (activeProjects.length === 0) {
      const now = new Date();
      return { minDate: now, maxDate: addDays(now, 180) };
    }
    let min = new Date(activeProjects[0].start_date);
    let max = addDays(new Date(), 90);
    for (const p of activeProjects) {
      const s = new Date(p.start_date);
      if (s < min) min = s;
      const est = estimateEndDate(p);
      const end = p.actual_end_date ? new Date(p.actual_end_date) : est || addDays(new Date(), 60);
      if (end > max) max = end;
    }
    return {
      minDate: startOfMonth(min),
      maxDate: endOfMonth(addDays(max, 30)),
    };
  }, [activeProjects]);

  const totalDays = differenceInDays(maxDate, minDate) || 1;
  const months = eachMonthOfInterval({ start: minDate, end: maxDate });

  const getPx = (date) => {
    const d = new Date(date);
    return Math.max(0, (differenceInDays(d, minDate) / totalDays) * 100);
  };

  const getWidth = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    return Math.max(0.5, (differenceInDays(e, s) / totalDays) * 100);
  };

  if (activeProjects.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
        <p className="text-slate-500">No projects with start dates to display in Gantt view.</p>
      </div>
    );
  }

  const today = new Date();
  const todayPct = getPx(today);

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">Project Timeline (Gantt)</h2>
        <p className="text-xs text-slate-400 mt-0.5">Solid bar = elapsed time · Dotted = system estimate to completion</p>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: "900px" }}>
          {/* Month headers */}
          <div className="flex border-b border-slate-100 bg-slate-50">
            <div className="w-60 flex-shrink-0 border-r border-slate-100 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Project</div>
            <div className="flex-1 relative h-8">
              {months.map((month) => (
                <div
                  key={month.toISOString()}
                  className="absolute top-0 h-full flex items-center px-2"
                  style={{ left: `${getPx(month)}%` }}
                >
                  <span className="text-xs font-medium text-slate-500">{format(month, "MMM yy")}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Project rows */}
          {activeProjects.map((project) => {
            const pct = getStagePct(project.current_stage);
            const estEnd = estimateEndDate(project);
            const barColor = BAR_COLORS[project.color] || BAR_COLORS.blue;
            const startLeft = getPx(project.start_date);
            const now = new Date();
            const elapsedWidth = getWidth(project.start_date, now > new Date(project.start_date) ? now : project.start_date);
            const endDate = project.actual_end_date
              ? new Date(project.actual_end_date)
              : estEnd || addDays(new Date(), 60);
            const estimatedWidth = getWidth(now, endDate);

            return (
              <div key={project.id} className="flex border-b border-slate-50 hover:bg-slate-50 group">
                {/* Label */}
                <div className="w-60 flex-shrink-0 border-r border-slate-100 px-4 py-3">
                  <p className="font-medium text-slate-800 text-sm truncate">{project.name}</p>
                  <p className="text-xs text-slate-400 truncate">{project.client_name || project.company}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-slate-100 rounded-full h-1">
                      <div className="h-1 rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                    </div>
                    <span className="text-xs text-slate-500">{pct}%</span>
                  </div>
                </div>

                {/* Timeline */}
                <div className="flex-1 relative py-4" style={{ height: "64px" }}>
                  {/* Month grid lines */}
                  {months.map((month) => (
                    <div
                      key={month.toISOString()}
                      className="absolute top-0 bottom-0 border-l border-slate-100"
                      style={{ left: `${getPx(month)}%` }}
                    />
                  ))}

                  {/* Today line */}
                  <div
                    className="absolute top-0 bottom-0 border-l-2 border-red-400 z-10"
                    style={{ left: `${todayPct}%` }}
                  />

                  {/* Elapsed bar */}
                  {pct > 0 && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-5 rounded-l-full"
                      style={{
                        left: `${startLeft}%`,
                        width: `${elapsedWidth}%`,
                        backgroundColor: barColor,
                        opacity: 0.9,
                      }}
                    />
                  )}

                  {/* Estimated remaining bar */}
                  {estEnd && pct < 100 && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-5 rounded-r-full border-2"
                      style={{
                        left: `${todayPct}%`,
                        width: `${estimatedWidth}%`,
                        borderColor: barColor,
                        backgroundColor: `${barColor}22`,
                        borderStyle: "dashed",
                      }}
                    />
                  )}

                  {/* Completion marker */}
                  {project.actual_end_date && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow z-20 flex items-center justify-center"
                      style={{ left: `${getPx(project.actual_end_date)}%`, transform: "translate(-50%,-50%)" }}
                    >
                      <span className="text-white text-[8px] font-bold">✓</span>
                    </div>
                  )}

                  {/* Est end label */}
                  {estEnd && pct < 100 && pct >= 14 && (
                    <div
                      className="absolute flex items-center gap-1 text-[10px] text-teal-700 font-medium whitespace-nowrap"
                      style={{ left: `${Math.min(getPx(estEnd), 90)}%`, top: "2px" }}
                    >
                      <TrendingUp className="w-3 h-3" />
                      {format(estEnd, "d MMM yy")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 p-4 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded-full bg-teal-500" />
          <span>Elapsed progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded border-2 border-dashed border-teal-500 bg-teal-50" />
          <span>System estimated remaining</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 bg-red-400" />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}