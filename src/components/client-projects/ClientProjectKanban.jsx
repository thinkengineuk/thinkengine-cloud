import React, { useState } from "react";
import { STAGE_COLUMNS } from "./projectStages";
import ClientProjectCard from "./ClientProjectCard";
import ClientProjectDetailModal from "./ClientProjectDetailModal";

export default function ClientProjectKanban({ projects, onRefresh, isAdmin }) {
  const [selectedProject, setSelectedProject] = useState(null);

  // Active projects (exclude Completed)
  const columns = STAGE_COLUMNS.filter(s => s !== "Completed");
  const completedProjects = projects.filter(p => p.current_stage === "Completed");

  return (
    <>
      <div className="pb-6 bg-white rounded-xl p-4">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
          {columns.map((stage, index) => {
            const stageProjects = projects.filter(p => p.current_stage === stage);
            return (
              <div key={stage} className="min-w-0">
                <div className="bg-slate-100 rounded-xl p-3 mb-3 h-16 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {stage !== "Completed" && (
                      <span className="bg-slate-300 text-slate-700 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">{index + 1}</span>
                    )}
                    <h3 className="text-slate-900 font-semibold text-xs leading-tight">
                      {stage.replace(/^Part \d+ - /, "")}
                    </h3>
                  </div>
                  <span className="text-slate-500 text-xs">{stageProjects.length} project{stageProjects.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-3">
                  {stageProjects.map(p => (
                    <ClientProjectCard
                      key={p.id}
                      project={p}
                      onClick={() => setSelectedProject(p)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {completedProjects.length > 0 && (
        <div className="mt-8 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-cyan-950">Completed Projects</h3>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(280px, 1fr))` }}>
            {completedProjects.map(p => (
              <ClientProjectCard
                key={p.id}
                project={p}
                onClick={() => setSelectedProject(p)}
              />
            ))}
          </div>
        </div>
      )}

      {selectedProject && (
        <ClientProjectDetailModal
          project={selectedProject}
          isAdmin={isAdmin}
          onClose={() => setSelectedProject(null)}
          onRefresh={() => { setSelectedProject(null); onRefresh(); }}
        />
      )}
    </>
  );
}