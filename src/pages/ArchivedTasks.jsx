import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Archive, RotateCcw, Search, Calendar, User } from "lucide-react";
import { format } from "date-fns";

export default function ArchivedTasks() {
  const [tasks, setTasks] = useState([]);
  const [boards, setBoards] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [restoring, setRestoring] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const allTasks = await base44.entities.Task.filter({ is_archived: true }, "-archived_at", 200);
    setTasks(allTasks);

    // Load board names for display
    const boardIds = [...new Set(allTasks.map(t => t.board_id).filter(Boolean))];
    const boardMap = {};
    for (const id of boardIds) {
      try {
        const board = await base44.entities.Board.get(id);
        boardMap[id] = board.name;
      } catch {
        boardMap[id] = "Unknown Board";
      }
    }
    setBoards(boardMap);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRestore = async (task) => {
    setRestoring(task.id);
    try {
      await base44.entities.Task.update(task.id, {
        is_archived: false,
        archived_at: null,
      });
      setTasks(prev => prev.filter(t => t.id !== task.id));
    } catch (error) {
      console.error("Error restoring task:", error);
    }
    setRestoring(null);
  };

  const filtered = tasks.filter(t =>
    t.title?.toLowerCase().includes(search.toLowerCase()) ||
    boards[t.board_id]?.toLowerCase().includes(search.toLowerCase())
  );

  const priorityColor = {
    high: "bg-red-100 text-red-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700",
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
          <Archive className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Archived Tasks</h1>
          <p className="text-sm text-slate-500">Tasks completed over 30 days ago — restore them to bring them back.</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search archived tasks..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Archive className="w-16 h-16 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No archived tasks</p>
          <p className="text-sm mt-1">Tasks completed for 30+ days will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <div key={task.id} className="flex items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:shadow-sm transition-shadow">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-800 truncate">{task.title}</span>
                  {task.priority && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor[task.priority] || ''}`}>
                      {task.priority}
                    </span>
                  )}
                  {task.tags?.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                  {boards[task.board_id] && (
                    <span className="flex items-center gap-1">
                      <Archive className="w-3 h-3" />
                      {boards[task.board_id]}
                    </span>
                  )}
                  {task.completed_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Completed {format(new Date(task.completed_at), "d MMM yyyy")}
                    </span>
                  )}
                  {task.assigned_to && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {task.assigned_to}
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRestore(task)}
                disabled={restoring === task.id}
                className="flex-shrink-0 gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {restoring === task.id ? "Restoring..." : "Restore"}
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-6 text-center">{filtered.length} archived task{filtered.length !== 1 ? "s" : ""}</p>
    </div>
  );
}