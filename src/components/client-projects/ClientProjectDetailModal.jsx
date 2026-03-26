import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, TrendingUp, Calendar, ExternalLink, CheckCircle2, Circle, Pencil } from "lucide-react";
import { STAGES, STAGE_COLUMNS, getStagePct, estimateEndDate, COLOR_MAP, PROGRESS_COLOR } from "./projectStages";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ClientProjectDetailModal({ project, isAdmin, onClose, onRefresh }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: project.name,
    client_name: project.client_name || "",
    company: project.company,
    client_type: project.client_type,
    description: project.description || "",
    current_stage: project.current_stage,
    estimated_end_date: project.estimated_end_date || "",
    actual_end_date: project.actual_end_date || "",
    notes: project.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [linkedTasks, setLinkedTasks] = useState([]);
  const [boards, setBoards] = useState({});

  useEffect(() => {
    const loadLinkedTasks = async () => {
      const tasks = await base44.entities.Task.filter({ client_project_id: project.id });
      setLinkedTasks(tasks);
      // Load boards for context
      const boardIds = [...new Set(tasks.map(t => t.board_id))];
      if (boardIds.length > 0) {
        const allBoards = await base44.entities.Board.list();
        const boardMap = {};
        allBoards.forEach(b => { boardMap[b.id] = b; });
        setBoards(boardMap);
      }
    };
    loadLinkedTasks();
  }, [project.id]);

  const pct = getStagePct(form.current_stage);
  const estEnd = estimateEndDate({ ...project, current_stage: form.current_stage });
  const gradientClass = COLOR_MAP[project.color] || COLOR_MAP.blue;
  const progressClass = PROGRESS_COLOR[project.color] || PROGRESS_COLOR.blue;

  const handleSave = async () => {
    setSaving(true);
    const updates = { ...form };

    // Track when stage changed
    if (form.current_stage !== project.current_stage) {
      const stageStartedAt = { ...(project.stage_started_at || {}) };
      stageStartedAt[form.current_stage] = new Date().toISOString().slice(0, 10);
      updates.stage_started_at = stageStartedAt;
    }

    await base44.entities.ClientProject.update(project.id, updates);
    setSaving(false);
    onRefresh();
  };

  const handleDelete = async () => {
    await base44.entities.ClientProject.delete(project.id);
    onRefresh();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className={`h-2 -mx-6 -mt-6 mb-4 bg-gradient-to-r ${gradientClass} rounded-t-lg`} />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <span>{project.name}</span>
            <Badge className={project.client_type === "Retained" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}>
              {project.client_type}
            </Badge>
            <Badge className="bg-slate-100 text-slate-600">{project.company}</Badge>
            {isAdmin && !editing && (
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => setEditing(true)}>
                <Pencil className="w-3 h-3 mr-1" /> Edit
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Progress summary */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Overall Progress</span>
            <span className="text-lg font-bold text-slate-900">{pct}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div className={`h-3 rounded-full ${progressClass} transition-all duration-500`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            {project.start_date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Started: {format(new Date(project.start_date), "d MMM yyyy")}
              </div>
            )}
            {estEnd && pct < 100 && (
              <div className="flex items-center gap-1 text-teal-600 font-semibold">
                <TrendingUp className="w-3 h-3" />
                System estimate: {format(estEnd, "d MMM yyyy")}
              </div>
            )}
          </div>
          {estEnd && pct < 100 && (
            <p className="text-xs text-slate-400">
              Based on {pct}% completion in {Math.floor((new Date() - new Date(project.start_date)) / (1000 * 60 * 60 * 24))} days — estimated total project duration: ~{Math.round((new Date() - new Date(project.start_date)) / (1000 * 60 * 60 * 24) / pct * 100)} days
            </p>
          )}
        </div>

        {/* Stage timeline */}
        <div className="space-y-1">
          <Label className="text-xs text-slate-500 uppercase tracking-wide">Stage Timeline</Label>
          <div className="flex gap-1 flex-wrap">
            {STAGES.filter(s => s.key !== "Completed").map((s) => {
              const isActive = s.key === form.current_stage;
              const isDone = getStagePct(form.current_stage) > s.pct;
              const startedOn = project.stage_started_at?.[s.key];
              return (
                <div
                  key={s.key}
                  title={`${s.label}${startedOn ? ` — started ${startedOn}` : ""}`}
                  className={`flex-1 min-w-[40px] h-2 rounded-full transition-all ${
                    isDone || isActive ? progressClass : "bg-slate-200"
                  } ${isActive ? "ring-2 ring-offset-1 ring-teal-400" : ""}`}
                />
              );
            })}
          </div>
          <div className="text-xs text-slate-500 mt-1">Current: <span className="font-medium text-slate-700">{form.current_stage}</span></div>
        </div>

        {/* Linked Tasks */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wide">
            <ExternalLink className="w-3 h-3" />
            Linked Tasks ({linkedTasks.length})
          </Label>
          {linkedTasks.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No tasks linked yet. Link tasks from any board card via the task sidebar.</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {linkedTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer group border border-transparent hover:border-slate-200 transition-all"
                  onClick={() => {
                    onClose();
                    navigate(`${createPageUrl("Board")}?id=${task.board_id}&taskId=${task.id}`);
                  }}
                >
                  {task.status === 'completed'
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  }
                  <span className={`text-sm flex-1 truncate ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    {task.title}
                  </span>
                  {boards[task.board_id] && (
                    <span className="text-xs text-slate-400 flex-shrink-0">{boards[task.board_id].name}</span>
                  )}
                  <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-teal-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {isAdmin && editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Project Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Client Name</Label>
                <Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Company</Label>
                <Select value={form.company} onValueChange={v => setForm({ ...form, company: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ThinkEngine">ThinkEngine</SelectItem>
                    <SelectItem value="Cogs">Cogs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Client Type</Label>
                <Select value={form.client_type} onValueChange={v => setForm({ ...form, client_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Retained">Retained</SelectItem>
                    <SelectItem value="Project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Current Stage</Label>
              <Select value={form.current_stage} onValueChange={v => setForm({ ...form, current_stage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGE_COLUMNS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Manual Est. End Date (optional)</Label>
                <Input type="date" value={form.estimated_end_date} onChange={e => setForm({ ...form, estimated_end_date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Actual End Date</Label>
                <Input type="date" value={form.actual_end_date} onChange={e => setForm({ ...form, actual_end_date: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes..." />
            </div>

            <div className="flex items-center justify-between pt-2">
              {!confirmDelete ? (
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={handleDelete}>Confirm Delete</Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                <Button onClick={async () => { await handleSave(); setEditing(false); }} disabled={saving} className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-slate-700">
            {form.description && <p>{form.description}</p>}
            {form.notes && <p className="text-slate-500 italic">{form.notes}</p>}
            <Button variant="outline" onClick={onClose} className="mt-4">Close</Button>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}