import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Calendar, Clock, User, Trash2, Eye, EyeOff, Pencil } from "lucide-react";
import { base44 } from "@/api/base44Client";
import EditRecurringAutomationDialog from "./EditRecurringAutomationDialog";

const patternLabel = {
  daily: "Daily", weekly: "Weekly", monthly: "Monthly",
  "3_monthly": "Every 3 Months", "6_monthly": "Every 6 Months", yearly: "Yearly",
};

export default function RecurringAutomationsListDialog({ open, onOpenChange, boardId, columnId, usersMap, users }) {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState(null);

  const load = () => {
    setLoading(true);
    base44.entities.RecurringAutomation.filter({ board_id: boardId, column_id: columnId })
      .then(setAutomations)
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (open && boardId) load(); }, [open, boardId, columnId]);

  const handleDelete = async (id) => {
    await base44.entities.RecurringAutomation.delete(id);
    setAutomations(prev => prev.filter(a => a.id !== id));
  };

  const handleToggle = async (automation) => {
    await base44.entities.RecurringAutomation.update(automation.id, { is_active: !automation.is_active });
    setAutomations(prev => prev.map(a => a.id === automation.id ? { ...a, is_active: !a.is_active } : a));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-500" />
            </div>
            Recurring Automations
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-2 pr-1">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
            </div>
          )}
          {!loading && automations.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No automations for this column.</p>
          )}
          {!loading && automations.map(automation => {
            const assignedUser = automation.assigned_to ? usersMap[automation.assigned_to] : null;
            return (
              <div key={automation.id} className={`border rounded-xl p-4 bg-white transition-colors ${automation.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{automation.title}</p>
                    {automation.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{automation.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Badge className={`text-xs border ${automation.is_active ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {patternLabel[automation.recurrence_pattern] || automation.recurrence_pattern}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                  {automation.recurrence_start_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      From {automation.recurrence_start_date}
                    </span>
                  )}
                  {automation.scheduled_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {automation.scheduled_time}
                    </span>
                  )}
                  {assignedUser && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {assignedUser.full_name}
                    </span>
                  )}
                  {automation.watchers?.length > 0 && (
                    <span className="text-slate-400">{automation.watchers.length} watcher{automation.watchers.length > 1 ? 's' : ''}</span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-100">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 hover:text-slate-700" onClick={() => setEditingAutomation(automation)}>
                    <Pencil className="w-3 h-3 mr-1" />Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 hover:text-slate-700" onClick={() => handleToggle(automation)}>
                    {automation.is_active ? <><EyeOff className="w-3 h-3 mr-1" />Pause</> : <><Eye className="w-3 h-3 mr-1" />Activate</>}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(automation.id)}>
                    <Trash2 className="w-3 h-3 mr-1" />Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>

      <EditRecurringAutomationDialog
        open={!!editingAutomation}
        onOpenChange={(v) => { if (!v) setEditingAutomation(null); }}
        automation={editingAutomation}
        users={users}
        onUpdated={() => { setEditingAutomation(null); load(); }}
      />
    </Dialog>
  );
}