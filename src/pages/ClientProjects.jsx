import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Columns, BarChart2, Shield } from "lucide-react";
import ClientProjectKanban from "../components/client-projects/ClientProjectKanban";
import ClientProjectGantt from "../components/client-projects/ClientProjectGantt";
import CreateClientProjectDialog from "../components/client-projects/CreateClientProjectDialog";

export default function ClientProjects() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [view, setView] = useState("kanban");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [companyFilter, setCompanyFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    setUser(me);

    if (me?.company !== "ThinkEngine") {
      setLoading(false);
      return;
    }

    const all = await base44.entities.ClientProject.list("-created_date");
    setProjects(all);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (user?.company !== "ThinkEngine") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center max-w-sm text-center">
          <Shield className="w-14 h-14 text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-slate-500">Only ThinkEngine team members can access Client Projects.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Client Projects</h1>
            <p className="text-white/80 mt-1">Track all retained & project clients across ThinkEngine & Cogs</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-1 flex gap-1">
              <button
                onClick={() => setView("kanban")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  view === "kanban" ? "bg-white text-slate-800 shadow" : "text-white hover:bg-white/20"
                }`}
              >
                <Columns className="w-4 h-4" />
                Kanban
              </button>
              <button
                onClick={() => setView("gantt")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  view === "gantt" ? "bg-white text-slate-800 shadow" : "text-white hover:bg-white/20"
                }`}
              >
                <BarChart2 className="w-4 h-4" />
                Gantt
              </button>
            </div>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-white text-teal-700 hover:bg-white/90 font-semibold shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
          </div>
        </div>

        {/* Company Filter */}
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-1 flex gap-1 w-fit">
          {["all", "ThinkEngine Marketing", "ThinkEngine Tech", "Cogs"].map((opt) => (
            <button
              key={opt}
              onClick={() => setCompanyFilter(opt)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                companyFilter === opt ? "bg-white text-slate-800 shadow" : "text-white hover:bg-white/20"
              }`}
            >
              {opt === "all" ? "All Projects" : opt}
            </button>
          ))}
        </div>

        {view === "kanban" ? (
          <ClientProjectKanban
            projects={projects.filter(p => companyFilter === "all" || p.company === companyFilter)}
            onRefresh={loadData}
            isAdmin={true}
          />
        ) : (
          <ClientProjectGantt projects={projects.filter(p => companyFilter === "all" || p.company === companyFilter)} />
        )}
      </div>

      {showCreate && (
        <CreateClientProjectDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          onCreated={loadData}
        />
      )}
    </div>
  );
}