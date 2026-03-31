import React, { useState, useEffect } from "react";
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
import { base44 } from "@/api/base44Client";
import { listAllUsers } from "@/functions/listAllUsers";
import { STAGE_COLUMNS } from "@/components/client-projects/projectStages";
import { FolderKanban } from "lucide-react";
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
    priority: "medium"
  });
  const [users, setUsers] = useState([]);
  const [boardMembers, setBoardMembers] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientProjects, setClientProjects] = useState([]);

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
        client_project_id: null,
        client_project_stage: null
      });
      setNewTag("");
      setIsSubmitting(false);
      loadUsers();
      loadClientProjects();
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

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag("");
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
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
                    onSelect={(date) => setFormData({ ...formData, due_date: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add a tag and press Enter"
                disabled={isSubmitting}
              />
              <Button type="button" onClick={handleAddTag} disabled={isSubmitting}>Add</Button>
            </div>
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
                      className="hover:text-red-600 font-bold"
                      disabled={isSubmitting}
                    >
                      ×
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