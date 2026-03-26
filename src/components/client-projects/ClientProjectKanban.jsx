import React, { useState } from "react";
import { STAGE_COLUMNS } from "./projectStages";
import ClientProjectCard from "./ClientProjectCard";
import ClientProjectDetailModal from "./ClientProjectDetailModal";

export default function ClientProjectKanban({ projects, onRefresh, isAdmin }) {
  const [selectedProject, setSelectedProject] = useState(null);

  // Filter out "Completed" for main view — show as last col
  const columns = STAGE_COLUMNS;

  return (
    <>
      <div className="pb-6 bg-white rounded-xl p-4">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
          {columns.map((stage, index) => {
            const stageProjects = projects.filter(p => p.current_stage === stage);
            return (
              <div key={stage} className="min-w-0">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 mb-3 h-16 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {stage !== "Completed" && (
                      <span className="bg-white/30 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">{index + 1}</span>
                    )}
                    <h3 className="text-white font-semibold text-xs leading-tight">
                      {stage.replace(/^Part \d+ - /, "")}
                    </h3>
                  </div>
                  <span className="text-white/70 text-xs">{stageProjects.length} project{stageProjects.length !== 1 ? "s" : ""}</span>
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