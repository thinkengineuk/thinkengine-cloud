import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarIcon, User, Eye, Tag, AlertCircle, Trash2, Repeat, CheckCircle2, FolderKanban } from "lucide-react";
import { base44 } from "@/api/base44Client";
import TimeTrackingSection from "./TimeTrackingSection";
import { Badge } from "@/components/ui/badge";
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Task } from "@/entities/Task";
import { Board } from "@/entities/Board";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { STAGE_COLUMNS } from "@/components/client-projects/projectStages";

export default function TaskDetailSidebar({ task, allUsers, currentUser, onUpdate, onAssign, onAddWatcher, onClose, onRefresh }) {
  const [newTag, setNewTag] = useState("");
  const [allBoardTags, setAllBoardTags] = useState([]);
  const [showWatchersDialog, setShowWatchersDialog] = useState(false); // Existing watcher dialog state
  const [showTagDialog, setShowTagDialog] = useState(false);
  // New states introduced by the outline's implied requirements
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedWatcher, setSelectedWatcher] = useState("");
  const [showWatcherDialog, setShowWatcherDialog] = useState(false); // Potentially new watcher dialog state (singular)
  const [boardMembers, setBoardMembers] = useState([]);
  const [clientProjects, setClientProjects] = useState([]);

  const usersMap = React.useMemo(() => {
    return (allUsers || []).reduce((acc, user) => {
      acc[user.email] = user;
      return acc;
    }, {});
  }, [allUsers]);

  React.useEffect(() => {
    const loadClientProjects = async () => {
      const projects = await base44.entities.ClientProject.list();
      setClientProjects(projects);
    };
    loadClientProjects();
  }, []);

  React.useEffect(() => {
    const loadBoardTags = async () => {
      if (!task?.board_id) return;
      const allTasks = await Task.filter({ board_id: task.board_id });
      const tagsSet = new Set();
      allTasks.forEach(t => {
        if (t.tags) {
          t.tags.forEach(tag => tagsSet.add(tag));
        }
      });
      setAllBoardTags(Array.from(tagsSet).sort());
    };
    loadBoardTags();
  }, [task?.board_id]);

  // New useEffect to load board members
  React.useEffect(() => {
    const loadBoardMembers = async () => {
      if (!task?.board_id) return;
      // Board.filter returns an array, we expect one board for a given ID
      const boardData = await Board.filter({ id: task.board_id });
      if (boardData.length > 0) {
        const board = boardData[0];
        // Filter allUsers to only include those whose emails are in the board's members array
        const members = (allUsers || []).filter(user =>
          board.members?.includes(user.email)
        );
        setBoardMembers(members);
      } else {
        setBoardMembers([]); // No board found, no members
      }
    };
    loadBoardMembers();
  }, [task?.board_id, allUsers]);


  const addTag = () => {
    if (newTag.trim() && !task.tags?.includes(newTag.trim())) {
      onUpdate({ tags: [...(task.tags || []), newTag.trim()] });
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    onUpdate({ tags: (task.tags || []).filter(t => t !== tagToRemove) });
  };

  const removeWatcher = (watcherToRemove) => {
    onUpdate({ watchers: (task.watchers || []).filter(w => w !== watcherToRemove) });
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${task.title}"? This action cannot be undone.`)) {
      await Task.delete(task.id);
      onClose();
      onRefresh();
    }
  };

  const handleRecurringToggle = (checked) => {
    if (!checked) {
      onUpdate({
        is_recurring: false,
        recurrence_pattern: null,
        recurrence_start_date: null,
      });
    } else {
      onUpdate({ is_recurring: true });
    }
  };

  // New functions as per outline
  const handleAssignClick = async (email) => {
    await onAssign(email);
    setShowAssignDialog(false);
  };

  const handleAddWatcherClick = async () => {
    if (!selectedWatcher) return;
    await onAddWatcher(selectedWatcher);
    setSelectedWatcher("");
    setShowWatcherDialog(false);
  };

  const handleCompleteTask = async () => {
    await onUpdate({ status: 'completed' });
  };

  // Helper function to safely parse and validate dates
  const parseDate = (dateString) => {
    if (!dateString) return undefined;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return undefined;
      return date;
    } catch (error) {
      return undefined;
    }
  };

  const taskDueDate = task.due_date ? parseDate(task.due_date) : undefined;
  const taskCreatedDate = task.created_date ? parseDate(task.created_date) : undefined;
  const taskUpdatedDate = task.updated_date ? parseDate(task.updated_date) : undefined;
  const recurringStartDate = task.recurrence_start_date ? parseDate(task.recurrence_start_date) : undefined;

  return (
    <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 bg-white overflow-y-auto flex-shrink-0">
      <div className="p-4 space-y-6">
        {/* Complete Task Button */}
        {task.status !== 'completed' && (
          <Button
            onClick={handleCompleteTask}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Complete Task
          </Button>
        )}

        {task.status === 'completed' && (
          <Button
            onClick={() => onUpdate({ status: 'active' })}
            className="w-full bg-slate-600 hover:bg-slate-700 text-white"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Reopen Task
          </Button>
        )}

        {/* Time Tracking */}
        <div className="border-b border-slate-200 pb-6">
          <TimeTrackingSection
            task={task}
            currentUser={currentUser}
            onRefresh={onRefresh}
          />
        </div>

        {/* Assigned To */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <User className="w-4 h-4" />
            Assigned To
          </Label>
          <Select value={task.assigned_to || ""} onValueChange={onAssign}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select assignee" />
            </SelectTrigger>
            <SelectContent>
              {boardMembers.map((user) => ( // Filtered to board members
                <SelectItem key={user.id} value={user.email}>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      {user.profile_picture_url ? (
                        <AvatarImage src={user.profile_picture_url} />
                      ) : (
                        <AvatarFallback className="text-xs">{user.full_name ? user.full_name[0] : '?'}</AvatarFallback>
                      )}
                    </Avatar>
                    <span className="text-sm">{user.full_name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Watchers */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Eye className="w-4 h-4" />
              Watchers
            </Label>
            <Dialog open={showWatchersDialog} onOpenChange={setShowWatchersDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-xs px-2">
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Add Watchers</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {boardMembers // Filtered to board members
                      .filter(u => !(task.watchers || []).includes(u.email))
                      .map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                          onClick={() => {
                            // This currently calls onAddWatcher directly, not handleAddWatcherClick
                            onAddWatcher(user.email);
                            setShowWatchersDialog(false);
                          }}
                        >
                          <Avatar className="w-8 h-8">
                            {user.profile_picture_url ? (
                              <AvatarImage src={user.profile_picture_url} />
                            ) : (
                              <AvatarFallback className="text-xs">{user.full_name ? user.full_name[0] : '?'}</AvatarFallback>
                            )}
                          </Avatar>
                          <span className="text-sm">{user.full_name}</span>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
          {task.watchers && task.watchers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {task.watchers.map((email) => {
                const user = boardMembers.find(u => u.email === email); // Find user from boardMembers
                return user ? (
                  <div key={email} className="flex items-center gap-1 bg-slate-100 rounded-full pl-1 pr-2 py-1">
                    <Avatar className="w-5 h-5">
                      {user.profile_picture_url ? (
                        <AvatarImage src={user.profile_picture_url} />
                      ) : (
                        <AvatarFallback className="text-[10px]">{user.full_name ? user.full_name[0] : '?'}</AvatarFallback>
                      )}
                    </Avatar>
                    <span className="text-xs">{user.full_name}</span>
                    <button
                      onClick={() => removeWatcher(email)}
                      className="ml-1 text-slate-400 hover:text-red-600 font-bold text-sm"
                    >
                      ×
                    </button>
                  </div>
                ) : null;
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No watchers yet</p>
          )}
        </div>

        {/* Due Date */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CalendarIcon className="w-4 h-4" />
            Due Date
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start bg-white text-sm">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {task.due_date ? format(new Date(task.due_date), 'PPP') : 'Set due date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={taskDueDate}
                onSelect={(date) => onUpdate({ due_date: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Priority */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <AlertCircle className="w-4 h-4" />
            Priority
          </Label>
          <Select value={task.priority || "medium"} onValueChange={(value) => onUpdate({ priority: value })}>
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low Priority</SelectItem>
              <SelectItem value="medium">Medium Priority</SelectItem>
              <SelectItem value="high">High Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tags */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Tag className="w-4 h-4" />
              Tags
            </Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs px-2"
              onClick={() => setShowTagDialog(true)}
            >
              Edit All
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
              placeholder="Add tag"
              className="flex-1 bg-white text-sm"
            />
            <Button onClick={addTag} size="sm" className="bg-slate-900 hover:bg-slate-800 px-4">
              Add
            </Button>
          </div>

          {task.tags && task.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {task.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs py-1 px-2">
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-1.5 hover:text-red-600 font-bold"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No tags yet</p>
          )}
        </div>

        {/* Client Project Link */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FolderKanban className="w-4 h-4" />
            Linked Client Project
          </Label>
          <Select
            value={task.client_project_id || "none"}
            onValueChange={(v) => {
              if (v === "none") {
                onUpdate({ client_project_id: null, client_project_stage: null });
              } else {
                const project = clientProjects.find(p => p.id === v);
                onUpdate({
                  client_project_id: v,
                  client_project_stage: project?.current_stage || null
                });
              }
            }}
          >
            <SelectTrigger className="bg-white">
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

          {task.client_project_id && (() => {
            const linkedProject = clientProjects.find(p => p.id === task.client_project_id);
            return linkedProject ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  Current project stage: <span className="font-semibold text-teal-600">{linkedProject.current_stage}</span>
                </p>
                <Label className="text-xs text-slate-600">Link task to stage:</Label>
                <Select
                  value={task.client_project_stage || linkedProject.current_stage}
                  onValueChange={(v) => onUpdate({ client_project_stage: v })}
                >
                  <SelectTrigger className="bg-white text-xs h-8">
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

        {/* Recurring Task */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Repeat className="w-4 h-4" />
            Recurring Task
          </Label>

          <div className="flex items-center gap-2">
            <Checkbox
              id="recurring"
              checked={task.is_recurring || false}
              onCheckedChange={handleRecurringToggle}
            />
            <label htmlFor="recurring" className="text-sm cursor-pointer">
              Make this a recurring task
            </label>
          </div>

          {task.is_recurring && (
            <div className="space-y-3 pl-6">
              <div>
                <Label className="text-xs text-slate-600 mb-2">Repeat</Label>
                <Select
                  value={task.recurrence_pattern || ""}
                  onValueChange={(value) => onUpdate({ recurrence_pattern: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-600 mb-2">Starting</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {recurringStartDate ? format(recurringStartDate, 'PPP') : 'Set start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={recurringStartDate}
                      onSelect={(date) => onUpdate({ recurrence_start_date: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="text-xs text-slate-600 bg-blue-50 p-2 rounded">
                <strong>Note:</strong> When you mark this task as complete, a new instance will automatically be created based on your recurrence pattern.
              </div>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="pt-4 border-t border-slate-200 space-y-2 text-xs text-slate-600">
          {task.created_date && (
            <p><span className="font-semibold">Created:</span> {format(new Date(task.created_date), 'PPP')}</p>
          )}
          {task.updated_date && (
            <p><span className="font-semibold">Updated:</span> {format(new Date(task.updated_date), 'PPP')}</p>
          )}
          {task.created_by && (
            <p className="break-all"><span className="font-semibold">Created by:</span> {task.created_by}</p>
          )}
        </div>

        {/* Delete Button - Only on mobile */}
        <Button
          onClick={handleDelete}
          variant="destructive"
          className="w-full mt-4 lg:hidden"
          size="sm"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Task
        </Button>
      </div>

      {/* Tag Management Dialog */}
      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Manage Task Tags</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-700">Current Tags</h4>
            <div className="flex flex-wrap gap-2 min-h-[36px]">
              {(task.tags || []).length > 0 ? (
                (task.tags || []).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-sm px-2 py-1">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-2 hover:text-red-600 font-bold"
                    >
                      ×
                    </button>
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-slate-500">No tags on this task.</p>
              )}
            </div>

            <h4 className="text-sm font-semibold text-slate-700 mt-4">Add from Board Tags</h4>
            {allBoardTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {allBoardTags
                        .filter(tag => !(task.tags || []).includes(tag))
                        .map(tag => (
                        <Badge
                            key={tag}
                            variant="outline"
                            className="cursor-pointer hover:bg-slate-100"
                            onClick={() => {
                                onUpdate({ tags: [...(task.tags || []), tag] });
                            }}
                        >
                            {tag}
                        </Badge>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-slate-500">No other tags found on this board.</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowTagDialog(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}