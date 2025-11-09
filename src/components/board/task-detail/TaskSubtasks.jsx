import React, { useState, useEffect } from "react";
import { Subtask } from "@/entities/Subtask";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TaskSubtasks({ task, onRefresh }) {
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [users, setUsers] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadSubtasks();
    loadUsers();
  }, [task.id]);

  const loadSubtasks = async () => {
    const data = await Subtask.filter({ parent_task_id: task.id }, "position");
    setSubtasks(data);
  };

  const loadUsers = async () => {
    const allUsers = await User.list();
    setUsers(allUsers);
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    await Subtask.create({
      parent_task_id: task.id,
      title: newSubtaskTitle,
      completed: false,
      position: subtasks.length,
    });

    setNewSubtaskTitle("");
    loadSubtasks();
    onRefresh();
  };

  const handleToggleSubtask = async (subtask) => {
    await Subtask.update(subtask.id, {
      completed: !subtask.completed,
    });
    loadSubtasks();
    onRefresh();
  };

  const handleAssignSubtask = async (subtask, email) => {
    await Subtask.update(subtask.id, {
      assigned_to: email,
    });
    loadSubtasks();
    onRefresh();
  };

  const handleDeleteSubtask = async (subtaskId) => {
    await Subtask.delete(subtaskId);
    loadSubtasks();
    onRefresh();
  };

  const completedCount = subtasks.filter(s => s.completed).length;
  const totalCount = subtasks.length;

  return (
    <div className="border-b border-slate-200 py-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left hover:bg-slate-50 -mx-2 px-2 py-1 rounded transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-slate-600" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-600" />
          )}
          <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 12h6m-6 4h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3 className="font-semibold text-slate-900">Subtasks</h3>
          {totalCount > 0 && (
            <span className="text-sm text-slate-500">
              {completedCount}/{totalCount}
            </span>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2 pl-10">
          {subtasks.map((subtask) => {
            const assignedUser = users.find(u => u.email === subtask.assigned_to);
            
            return (
              <div
                key={subtask.id}
                className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg group"
              >
                <Checkbox
                  checked={subtask.completed}
                  onCheckedChange={() => handleToggleSubtask(subtask)}
                />
                <span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                  {subtask.title}
                </span>
                
                <Select
                  value={subtask.assigned_to || ""}
                  onValueChange={(value) => handleAssignSubtask(subtask, value)}
                >
                  <SelectTrigger className="w-32 h-8 text-xs">
                    {assignedUser ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          {assignedUser.profile_picture_url ? (
                            <AvatarImage src={assignedUser.profile_picture_url} />
                          ) : (
                            <AvatarFallback className="text-[10px]">
                              {assignedUser.full_name[0]}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className="truncate">{assignedUser.full_name.split(' ')[0]}</span>
                      </div>
                    ) : (
                      <SelectValue placeholder="Assign" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.email}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5 h-5">
                            {user.profile_picture_url ? (
                              <AvatarImage src={user.profile_picture_url} />
                            ) : (
                              <AvatarFallback className="text-[10px]">
                                {user.full_name[0]}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          {user.full_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteSubtask(subtask.id)}
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            );
          })}

          <div className="flex items-center gap-2 pt-2">
            <Input
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
              placeholder="Add subtask..."
              className="flex-1 h-9 text-sm"
            />
            <Button
              onClick={handleAddSubtask}
              disabled={!newSubtaskTitle.trim()}
              size="sm"
              className="h-9"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}