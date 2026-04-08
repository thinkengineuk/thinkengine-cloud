import React, { useState, useRef, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Zap, ChevronRight, ChevronDown, X } from "lucide-react";
import RecurrencePicker from "@/components/shared/RecurrencePicker";
import { base44 } from "@/api/base44Client";

export default function CreateRecurringAutomationDialog({ open, onOpenChange, column, users, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recurrencePattern, setRecurrencePattern] = useState("monthly");
  const [recurrenceSummary, setRecurrenceSummary] = useState("Monthly");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [assignedTo, setAssignedTo] = useState("");
  const [watchers, setWatchers] = useState([]);
  const [priority, setPriority] = useState("medium");
  const [tags, setTags] = useState([]);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [existingBoardTags, setExistingBoardTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (open && column?.board_id) {
      base44.entities.Task.filter({ board_id: column.board_id }).then(tasks => {
        const tagsSet = new Set();
        tasks.forEach(t => t.tags?.forEach(tag => tagsSet.add(tag)));
        setExistingBoardTags(Array.from(tagsSet).sort());
      });
    }
  }, [open, column?.board_id]);

  const STATIC_TAGS = ["High", "Medium", "Low", "CogsAI", "ThinkEngine"];

  const allAvailableTags = useMemo(() => {
    return [...new Set([...STATIC_TAGS, ...existingBoardTags])].sort();
  }, [existingBoardTags]);

  const filteredTags = useMemo(() => {
    const q = tagSearch.toLowerCase();
    return allAvailableTags.filter(t => t.toLowerCase().includes(q) && !tags.includes(t));
  }, [allAvailableTags, tagSearch, tags]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await base44.entities.RecurringAutomation.create({
      board_id: column.board_id,
      column_id: column.id,
      title: title.trim(),
      description: description.trim() || undefined,
      recurrence_pattern: recurrencePattern,
      recurrence_start_date: startDate,
      scheduled_time: scheduledTime,
      assigned_to: assignedTo || undefined,
      watchers: watchers.length > 0 ? watchers : undefined,
      priority,
      tags: tags.length > 0 ? tags : undefined,
      is_active: true,
    });
    setSaving(false);
    setTitle(""); setDescription(""); setRecurrencePattern("monthly");
    setAssignedTo(""); setWatchers([]); setPriority("medium"); setTags([]); setTagSearch("");
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-500" />
            </div>
            Recurring Automation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1 overflow-y-auto flex-1 pr-1">
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

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">In Section</p>
            <p className="text-sm text-slate-400">{column?.name || "—"}</p>
          </div>

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
                  <RecurrencePicker
                    value={recurrencePattern}
                    onChange={(pattern, summary) => { setRecurrencePattern(pattern); setRecurrenceSummary(summary); }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Starting Date</p>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Time of Day</p>
              <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assign To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {(users || []).map(u => <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tags</Label>
            <Popover open={tagDropdownOpen} onOpenChange={setTagDropdownOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between font-normal text-sm">
                  <span className="text-slate-500">Select or add tags...</span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2" align="start">
                <Input
                  value={tagSearch}
                  onChange={e => setTagSearch(e.target.value)}
                  placeholder="Search or type new tag..."
                  className="mb-2 h-8 text-sm"
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (filteredTags.length > 0) {
                        if (!tags.includes(filteredTags[0])) setTags(prev => [...prev, filteredTags[0]]);
                        setTagSearch("");
                      } else if (tagSearch.trim()) {
                        const t = tagSearch.trim();
                        if (!tags.includes(t)) setTags(prev => [...prev, t]);
                        setTagSearch("");
                      }
                    }
                  }}
                />
                <ScrollArea className="h-52">
                  <div className="space-y-0.5 pr-3">
                    {filteredTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => { if (!tags.includes(tag)) setTags(prev => [...prev, tag]); setTagSearch(""); }}
                        className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-slate-100 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                    {tagSearch.trim() && !allAvailableTags.some(t => t.toLowerCase() === tagSearch.toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => { const t = tagSearch.trim(); if (!tags.includes(t)) setTags(prev => [...prev, t]); setTagSearch(""); }}
                        className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-blue-50 text-blue-700 transition-colors"
                      >
                        + Add "{tagSearch.trim()}"
                      </button>
                    )}
                    {filteredTags.length === 0 && !tagSearch.trim() && (
                      <p className="text-xs text-slate-400 px-2 py-2">All tags selected</p>
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs rounded px-2 py-1">
                    {tag}
                    <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))}>
                      <X className="w-3 h-3 hover:text-red-600" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Watchers</Label>
            <Select onValueChange={(email) => { if (!watchers.includes(email)) setWatchers(prev => [...prev, email]); }}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Add watchers..." /></SelectTrigger>
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
          <Button onClick={handleSubmit} disabled={saving || !title.trim()} className="bg-purple-600 hover:bg-purple-700 text-white">
            {saving ? "Creating..." : "Create Automation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}