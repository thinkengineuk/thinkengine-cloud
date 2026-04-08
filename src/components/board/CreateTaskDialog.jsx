import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Board } from "@/entities/Board";
import { Task } from "@/entities/Task";
import { base44 } from "@/api/base44Client";
import { listAllUsers } from "@/functions/listAllUsers";
import { STAGE_COLUMNS } from "@/components/client-projects/projectStages";
import { FolderKanban, X, ChevronDown, Plus, Clock, CheckSquare, RefreshCw, Flag } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

export default function CreateTaskDialog({ open, onOpenChange, onSubmit }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigned_to: "",
    due_date: null,
    tags: [],
    watchers: [],
    priority: "medium",
    estimated_minutes: "",
  });
  const [checklistItems, setChecklistItems] = useState([]);
  const [checklistInput, setChecklistInput] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState("weekly");
  const [users, setUsers] = useState([]);
  const [boardMembers, setBoardMembers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientProjects, setClientProjects] = useState([]);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [existingBoardTags, setExistingBoardTags] = useState([]);

  useEffect(() => {
    if (open) {
      setFormData({
        title: "",
        description: "",
        assigned_to: "",
        due_date: null,
        tags: [],
        watchers: [],
        priority: "medium",
        estimated_minutes: "",
        client_project_id: null,
        client_project_stage: null
      });
      setChecklistItems([]);
      setChecklistInput("");
      setTagSearch("");
      setIsRecurring(false);
      setRecurrencePattern("weekly");
      setIsSubmitting(false);
      loadUsers();
      loadClientProjects();
      const boardId = new URLSearchParams(window.location.search).get('id');
      if (boardId) {
        Task.filter({ board_id: boardId }).then(tasks => {
          const tagsSet = new Set();
          tasks.forEach(t => t.tags?.forEach(tag => tagsSet.add(tag)));
          setExistingBoardTags(Array.from(tagsSet).sort());
        });
      }
    }
  }, [open]);

  const loadClientProjects = async () => {
    const projects = await base44.entities.ClientProject.list();
    setClientProjects(projects);
  };

  const loadUsers = async () => {
    const response = await listAllUsers({});
    const allUsers = response.data?.users || [];
    setUsers(allUsers);
    
    // Get board members from URL
    const urlParams = new URLSearchParams(window.location.search);
    const boardId = urlParams.get('id');
    
    if (boardId) {
      const boardData = await Board.filter({ id: boardId });
      if (boardData.length > 0) {
        const board = boardData[0];
        const members = allUsers.filter(user => 
          board.members?.includes(user.email)
        );
        setBoardMembers(members);
      }
    }
  };

  const STATIC_TAGS = ["High", "Medium", "Low", "CogsAI", "ThinkEngine"];

  const allAvailableTags = useMemo(() => {
    const clientNames = clientProjects.map(p => p.name).filter(Boolean);
    const combined = [...new Set([...STATIC_TAGS, ...clientNames, ...existingBoardTags])].sort();
    return combined;
  }, [clientProjects, existingBoardTags]);

  const filteredTags = useMemo(() => {
    const q = tagSearch.toLowerCase();
    return allAvailableTags.filter(t => t.toLowerCase().includes(q) && !formData.tags.includes(t));
  }, [allAvailableTags, tagSearch, formData.tags]);

  const handleSelectTag = (tag) => {
    if (!formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
    }
    setTagSearch("");
  };

  const handleAddCustomTag = () => {
    const tag = tagSearch.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
    }
    setTagSearch("");
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tagToRemove)
    });
  };

  const handleWatcherToggle = (email) => {
    setFormData(prev => {
      const watchers = prev.watchers.includes(email)
        ? prev.watchers.filter(w => w !== email)
        : [...prev.watchers, email];
      return { ...prev, watchers };
    });
  };

  const handleAddChecklistItem = () => {
    const text = checklistInput.trim();
    if (!text) return;
    setChecklistItems(prev => [...prev, text]);
    setChecklistInput("");
  };

  const handleRemoveChecklistItem = (index) => {
    setChecklistItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        estimated_minutes: formData.estimated_minutes ? Number(formData.estimated_minutes) : undefined,
        _checklistItems: checklistItems,
        is_recurring: isRecurring || undefined,
        recurrence_pattern: isRecurring ? recurrencePattern : undefined,
        recurrence_start_date: isRecurring ? new Date().toISOString().split('T')[0] : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Design new landing page"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details, links, etc."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select
                value={formData.assigned_to}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {boardMembers.map((user) => (
                    <SelectItem key={user.id} value={user.email}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    disabled={isSubmitting}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? format(formData.due_date, 'PPP') : 'Set date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.due_date}
                    onSelect={(date) => {
                      if (date) {
                        const existing = formData.due_date;
                        const hours = existing ? existing.getHours() : 17;
                        const mins = existing ? existing.getMinutes() : 0;
                        date.setHours(hours, mins, 0, 0);
                      }
                      setFormData({ ...formData, due_date: date });
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {formData.due_date && (
                <Input
                  type="time"
                  value={format(formData.due_date, 'HH:mm')}
                  onChange={(e) => {
                    const [hours, mins] = e.target.value.split(':').map(Number);
                    const updated = new Date(formData.due_date);
                    updated.setHours(hours, mins, 0, 0);
                    setFormData({ ...formData, due_date: updated });
                  }}
                  disabled={isSubmitting}
                />
              )}
            </div>
            </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Flag className="w-4 h-4" />Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><RefreshCw className="w-4 h-4" />Recurring</Label>
              <Select
                value={isRecurring ? recurrencePattern : "none"}
                onValueChange={(v) => {
                  if (v === "none") { setIsRecurring(false); }
                  else { setIsRecurring(true); setRecurrencePattern(v); }
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not recurring</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="3_monthly">Every 3 Months</SelectItem>
                  <SelectItem value="6_monthly">Every 6 Months</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <Popover open={tagDropdownOpen} onOpenChange={setTagDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between font-normal"
                  disabled={isSubmitting}
                >
                  <span className="text-slate-500">Select or add tags...</span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2" align="start">
                <Input
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  placeholder="Search or type new tag..."
                  className="mb-2 h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filteredTags.length > 0) handleSelectTag(filteredTags[0]);
                      else if (tagSearch.trim()) handleAddCustomTag();
                    }
                  }}
                />
                <ScrollArea className="h-52">
                  <div className="space-y-0.5 pr-3">
                  {filteredTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleSelectTag(tag)}
                      className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-slate-100 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                  {tagSearch.trim() && !allAvailableTags.some(t => t.toLowerCase() === tagSearch.toLowerCase()) && (
                    <button
                      type="button"
                      onClick={handleAddCustomTag}
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
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-600"
                      disabled={isSubmitting}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4" />
              Linked Client Project
            </Label>
            <Select
              value={formData.client_project_id || "none"}
              onValueChange={(v) => {
                if (v === "none") {
                  setFormData({ ...formData, client_project_id: null, client_project_stage: null });
                } else {
                  const project = clientProjects.find(p => p.id === v);
                  setFormData({
                    ...formData,
                    client_project_id: v,
                    client_project_stage: project?.current_stage || null
                  });
                }
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Link to a project..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project linked</SelectItem>
                {clientProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.client_name ? `— ${p.client_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {formData.client_project_id && (() => {
              const linkedProject = clientProjects.find(p => p.id === formData.client_project_id);
              return linkedProject ? (
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">
                    Current project stage: <span className="font-semibold text-teal-600">{linkedProject.current_stage}</span>
                  </p>
                  <Label className="text-xs text-slate-600">Link task to stage:</Label>
                  <Select
                    value={formData.client_project_stage || linkedProject.current_stage}
                    onValueChange={(v) => setFormData({ ...formData, client_project_stage: v })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_COLUMNS.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          <div className="flex items-center gap-2">
                            {stage === linkedProject.current_stage && (
                              <span className="text-xs text-teal-600 font-semibold">[Current]</span>
                            )}
                            {stage}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null;
            })()}
          </div>

          <div className="space-y-2">
            <Label>Watchers</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
              {boardMembers.map((user) => (
                <div key={user.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`watcher-${user.id}`}
                    checked={formData.watchers.includes(user.email)}
                    onCheckedChange={() => handleWatcherToggle(user.email)}
                    disabled={isSubmitting}
                  />
                  <label
                    htmlFor={`watcher-${user.id}`}
                    className="text-sm cursor-pointer"
                  >
                    {user.full_name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Estimated Time */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Estimated Time (minutes)
            </Label>
            <Input
              type="number"
              min="1"
              value={formData.estimated_minutes}
              onChange={(e) => setFormData({ ...formData, estimated_minutes: e.target.value })}
              placeholder="e.g. 60"
              disabled={isSubmitting}
            />
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              Checklist
            </Label>
            <div className="flex gap-2">
              <Input
                value={checklistInput}
                onChange={(e) => setChecklistInput(e.target.value)}
                placeholder="Add checklist item..."
                disabled={isSubmitting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddChecklistItem(); }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddChecklistItem} disabled={isSubmitting}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {checklistItems.length > 0 && (
              <div className="space-y-1 mt-1">
                {checklistItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 bg-slate-50 rounded px-2 py-1">
                    <span className="text-sm flex-1">{item}</span>
                    <button type="button" onClick={() => handleRemoveChecklistItem(index)} className="text-slate-400 hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}