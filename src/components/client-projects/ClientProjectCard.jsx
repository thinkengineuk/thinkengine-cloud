import React from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp } from "lucide-react";
import { getStagePct, estimateEndDate, COLOR_MAP, PROGRESS_COLOR } from "./projectStages";
import { format } from "date-fns";

export default function ClientProjectCard({ project, onClick }) {
  const pct = getStagePct(project.current_stage);
  const estEnd = estimateEndDate(project);
  const gradientClass = COLOR_MAP[project.color] || COLOR_MAP.blue;
  const progressClass = PROGRESS_COLOR[project.color] || PROGRESS_COLOR.blue;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden group"
    >
      <div className={`h-1.5 bg-gradient-to-r ${gradientClass}`} />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors text-sm leading-tight">
              {project.name}
            </h4>
            {project.client_name && (
              <p className="text-xs text-slate-500 mt-0.5">{project.client_name}</p>
            )}
          </div>
          <Badge
            className={`text-xs flex-shrink-0 ${
              project.client_type === "Retained"
                ? "bg-purple-100 text-purple-700 border-purple-200"
                : "bg-blue-100 text-blue-700 border-blue-200"
            }`}
          >
            {project.client_type}
          </Badge>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-500">Progress</span>
            <span className="text-xs font-semibold text-slate-700">{pct}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${progressClass} transition-all duration-500`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          {project.start_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(project.start_date), "d MMM yy")}
            </div>
          )}
          {estEnd && pct < 100 && (
            <div className="flex items-center gap-1 text-teal-600 font-medium">
              <TrendingUp className="w-3 h-3" />
              Est. {format(estEnd, "d MMM yy")}
            </div>
          )}
          {project.actual_end_date && pct === 100 && (
            <div className="flex items-center gap-1 text-green-600 font-medium">
              ✓ Done {format(new Date(project.actual_end_date), "d MMM yy")}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Badge className="text-xs bg-slate-100 text-slate-600 border-slate-200">
            {project.company}
          </Badge>
        </div>
      </div>
    </div>
  );
}