import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Calendar, User } from "lucide-react";
import { base44 } from "@/api/base44Client";

const patternLabel = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  "3_monthly": "Every 3 Months",
  "6_monthly": "Every 6 Months",
  yearly: "Yearly",
};

export default function RecurringTasksListDialog({ open, onOpenChange, boardId, columnId, usersMap, onTaskClick }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && boardId) {
      setLoading(true);
      base44.entities.Task.filter({ board_id: boardId, column_id: columnId, is_recurring: true })
        .then(setTasks)
        .finally(() => setLoading(false));
    }
  }, [open, boardId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-orange-500" />
            </div>
            Recurring Tasks
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-2 pr-1">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
            </div>
          )}
          {!loading && tasks.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No recurring tasks on this board.</p>
          )}
          {!loading && tasks.map(task => {
            const assignedUser = task.assigned_to ? usersMap[task.assigned_to] : null;
            return (
              <div
                key={task.id}
                onClick={() => { onTaskClick(task); onOpenChange(false); }}
                className="border border-slate-200 rounded-xl p-4 bg-white hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-800 text-sm">{task.title}</p>
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200 border text-xs whitespace-nowrap flex-shrink-0">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    {patternLabel[task.recurrence_pattern] || task.recurrence_pattern}
                  </Badge>
                </div>
                {task.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  {task.recurrence_start_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Starting {task.recurrence_start_date}
                    </span>
                  )}
                  {assignedUser && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {assignedUser.full_name}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}