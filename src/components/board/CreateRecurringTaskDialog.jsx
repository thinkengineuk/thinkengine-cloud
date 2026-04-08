import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format, addMonths, subMonths, getDaysInMonth } from "date-fns";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function RecurrencePicker({ value, onChange }) {
  const [tab, setTab] = useState("week");
  // Week state
  const [selectedDays, setSelectedDays] = useState(["Monday"]);
  const [everyWeeks, setEveryWeeks] = useState(1);
  // Month state
  const [selectedDayOfMonth, setSelectedDayOfMonth] = useState(null);
  const [everyMonths, setEveryMonths] = useState(1);
  // Year state
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedYearDate, setSelectedYearDate] = useState(null);
  const [everyYears, setEveryYears] = useState(1);

  const getSummary = () => {
    if (tab === "week") {
      const days = selectedDays.length > 0 ? selectedDays.map(d => d.slice(0, 3)).join(", ") : "—";
      return `Every ${everyWeeks} week${everyWeeks > 1 ? "s" : ""} on ${days}`;
    }
    if (tab === "month") {
      if (selectedDayOfMonth === "last") return `Monthly on the last day`;
      if (selectedDayOfMonth) return `Every ${everyMonths} month${everyMonths > 1 ? "s" : ""} on day ${selectedDayOfMonth}`;
      return "Monthly";
    }
    if (tab === "year") {
      if (selectedYearDate) return `Every ${everyYears} year${everyYears > 1 ? "s" : ""} on ${format(selectedYearDate, "MMM d")}`;
      return "Yearly";
    }
  };

  const getPattern = () => {
    if (tab === "week") return everyWeeks === 1 ? "weekly" : "weekly";
    if (tab === "month") return everyMonths >= 6 ? "6_monthly" : everyMonths >= 3 ? "3_monthly" : "monthly";
    return "yearly";
  };

  useEffect(() => {
    onChange(getPattern(), getSummary());
  }, [tab, selectedDays, everyWeeks, selectedDayOfMonth, everyMonths, selectedYearDate, everyYears]);

  const toggleDay = (day) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const daysInCalMonth = getDaysInMonth(calMonth);
  const firstDayOfMonth = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1).getDay();

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-4 w-72">
      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-full p-1 mb-4">
        {["week", "month", "year"].map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 text-sm font-medium py-1.5 rounded-full transition-all capitalize ${
              tab === t ? "bg-blue-500 text-white shadow" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Week tab */}
      {tab === "week" && (
        <div className="space-y-1">
          {DAYS_OF_WEEK.map(day => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedDays.includes(day)
                  ? "bg-blue-500 text-white font-medium"
                  : "hover:bg-slate-100 text-slate-700"
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      )}

      {/* Month tab */}
      {tab === "month" && (
        <div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDayOfMonth(d)}
                className={`text-xs rounded-full w-7 h-7 flex items-center justify-center transition-colors ${
                  selectedDayOfMonth === d
                    ? "bg-blue-500 text-white font-semibold"
                    : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedDayOfMonth("last")}
              className={`col-span-3 text-xs rounded-lg px-2 py-1 transition-colors ${
                selectedDayOfMonth === "last"
                  ? "bg-blue-500 text-white font-semibold"
                  : "hover:bg-slate-100 text-slate-500"
              }`}
            >
              Last day
            </button>
          </div>
        </div>
      )}

      {/* Year tab */}
      {tab === "year" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setCalMonth(subMonths(calMonth, 1))} className="p-1 hover:bg-slate-100 rounded">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold">{MONTH_NAMES[calMonth.getMonth()]}</span>
            <button type="button" onClick={() => setCalMonth(addMonths(calMonth, 1))} className="p-1 hover:bg-slate-100 rounded">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1) }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInCalMonth }, (_, i) => i + 1).map(d => {
              const date = new Date(calMonth.getFullYear(), calMonth.getMonth(), d);
              const isSelected = selectedYearDate && format(date, "yyyy-MM-dd") === format(selectedYearDate, "yyyy-MM-dd");
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedYearDate(date)}
                  className={`text-xs rounded-full w-7 h-7 flex items-center justify-center transition-colors ${
                    isSelected ? "bg-blue-500 text-white font-semibold" : "hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Every N units */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
        <span className="text-sm text-slate-600">Every</span>
        <input
          type="number"
          min={1}
          max={99}
          value={tab === "week" ? everyWeeks : tab === "month" ? everyMonths : everyYears}
          onChange={e => {
            const v = Math.max(1, parseInt(e.target.value) || 1);
            if (tab === "week") setEveryWeeks(v);
            else if (tab === "month") setEveryMonths(v);
            else setEveryYears(v);
          }}
          className="w-12 text-center border border-slate-200 rounded-md text-sm py-1"
        />
        <span className="text-sm text-slate-600">{tab === "week" ? "week" : tab === "month" ? "month" : "year"}{(tab === "week" ? everyWeeks : tab === "month" ? everyMonths : everyYears) > 1 ? "s" : ""}</span>
      </div>

      {/* Summary */}
      <p className="text-xs text-slate-400 mt-2">{getSummary()}</p>
    </div>
  );
}

export default function CreateRecurringTaskDialog({ open, onOpenChange, column, users, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recurrencePattern, setRecurrencePattern] = useState("monthly");
  const [recurrenceSummary, setRecurrenceSummary] = useState("Monthly");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("medium");
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