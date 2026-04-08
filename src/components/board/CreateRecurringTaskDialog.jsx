import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RefreshCw, ChevronRight, X } from "lucide-react";
import RecurrencePicker from "@/components/shared/RecurrencePicker";
import { base44 } from "@/api/base44Client";
import { format, addMonths, subMonths, getDaysInMonth } from "date-fns";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function CreateRecurringTaskDialog({ open, onOpenChange, column, users, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recurrencePattern, setRecurrencePattern] = useState("monthly");
  const [recurrenceSummary, setRecurrenceSummary] = useState("Monthly");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("medium");
  const [watchers, setWatchers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRecurrenceChange = (pattern, summary) => {
    setRecurrencePattern(pattern);
    setRecurrenceSummary(summary);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await base44.entities.Task.create({
      board_id: column.board_id,
      column_id: column.id,
      title: title.trim(),
      description: description.trim() || undefined,
      is_recurring: true,
      recurrence_pattern: recurrencePattern,
      recurrence_start_date: startDate,
      last_spawned_date: null,
      assigned_to: assignedTo || undefined,
      watchers: watchers.length > 0 ? watchers : undefined,
      priority,
      status: "active",
      position: 9999,
    });
    setSaving(false);
    setTitle("");
    setDescription("");
    setRecurrencePattern("monthly");
    setAssignedTo("");
    setPriority("medium");
    setWatchers([]);
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-orange-500" />
            </div>
            Recurring Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Task preview card */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm space-y-2">
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Task title..."
              className="border-0 p-0 text-base font-semibold shadow-none focus-visible:ring-0 placeholder:text-slate-400"
              autoFocus
            />
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={2}
              className="border-0 p-0 text-sm shadow-none focus-visible:ring-0 resize-none text-slate-500 placeholder:text-slate-300"
            />
          </div>

          {/* In Section */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">In Section</p>
            <p className="text-sm text-slate-400">{column?.name || "—"}</p>
          </div>

          {/* Repeat */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Repeat</p>
            <div className="relative" ref={pickerRef}>
              <button
                type="button"
                onClick={() => setShowPicker(v => !v)}
                className="w-full flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>{recurrenceSummary}</span>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showPicker ? "rotate-90" : ""}`} />
              </button>
              {showPicker && (
                <div className="absolute left-0 top-full mt-1 z-50">
                  <RecurrencePicker value={recurrencePattern} onChange={handleRecurrenceChange} />
                </div>
              )}
            </div>
          </div>

          {/* Starting */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Starting</p>
            <Input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Assign & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assign To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {(users || []).map(u => (
                    <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Watchers */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Watchers</Label>
            <Select
              onValueChange={(email) => {
                if (!watchers.includes(email)) setWatchers(prev => [...prev, email]);
              }}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Add watchers..." />
              </SelectTrigger>
              <SelectContent>
                {(users || []).filter(u => !watchers.includes(u.email)).map(u => (
                  <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {watchers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {watchers.map(email => {
                  const u = (users || []).find(u => u.email === email);
                  return (
                    <span key={email} className="flex items-center gap-1 bg-slate-100 text-slate-700 text-xs rounded-full px-2.5 py-1">
                      {u?.full_name || email}
                      <button type="button" onClick={() => setWatchers(prev => prev.filter(e => e !== email))}>
                        <X className="w-3 h-3 text-slate-400 hover:text-slate-700" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {saving ? "Creating..." : "Create Recurring Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}