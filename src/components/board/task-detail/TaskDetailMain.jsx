import React, { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Activity, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';

import TaskChecklists from "./TaskChecklists";
import TaskAttachments from "./TaskAttachments";
import TaskComments from "./TaskComments";
import TaskActivity from "./TaskActivity";

export default function TaskDetailMain({ task, allUsers, currentUser, onUpdate, onRefresh }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ title: '', description: '' });

  useEffect(() => {
    setEditData({
      title: task.title,
      description: task.description || "",
    });
    setIsEditing(false);
  }, [task]);

  const handleEditClick = () => {
    setEditData({ title: task.title, description: task.description || "" });
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
  };

  const handleSaveClick = () => {
    const updates = {};
    if (editData.title.trim() && editData.title !== task.title) {
      updates.title = editData.title;
    }
    if (editData.description !== (task.description || "")) {
      updates.description = editData.description;
    }
    if (Object.keys(updates).length > 0) {
      onUpdate(updates);
    }
    setIsEditing(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50">
      {/* Title and Description Section */}
      <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Details</h3>
          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditClick}
              className="flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelClick}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveClick}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title" className="text-sm font-medium text-slate-700">Title</Label>
              <Input
                id="edit-title"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="mt-2 text-base bg-white"
              />
            </div>
            <div>
              <Label htmlFor="edit-description" className="text-sm font-medium text-slate-700">Description</Label>
              <Textarea
                id="edit-description"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                className="mt-2 min-h-32 resize-none bg-white"
                placeholder="Add a description..."
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-2">Title</p>
              <p className="text-base text-slate-900">{task.title}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-2">Description</p>
              {task.description ? (
                <div className="prose prose-sm max-w-none text-slate-700">
                  <ReactMarkdown
                    components={{
                      a: ({node, ...props}) => (
                        <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" />
                      ),
                      p: ({node, ...props}) => {
                        const text = props.children?.toString() || '';
                        const urlRegex = /(https?:\/\/[^\s]+)/g;
                        if (urlRegex.test(text)) {
                          const parts = text.split(urlRegex);
                          return (
                            <p {...props}>
                              {parts.map((part, i) => 
                                urlRegex.test(part) ? (
                                  <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    {part}
                                  </a>
                                ) : part
                              )}
                            </p>
                          );
                        }
                        return <p {...props} />;
                      }
                    }}
                  >
                    {task.description}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-slate-400 text-sm italic">No description</p>
              )}
            </div>
          </div>
        )}
      </div>

      <Separator />

      <TaskChecklists taskId={task.id} allUsers={allUsers} onRefresh={onRefresh} />

      <Separator />

      <TaskAttachments task={task} onRefresh={onRefresh} />

      <Separator />

      <TaskComments 
        taskId={task.id}
        task={task}
        allUsers={allUsers}
        currentUser={currentUser}
        onRefresh={onRefresh}
      />

      <Separator />

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">Activity</h3>
        </div>
        <TaskActivity taskId={task.id} />
      </div>
    </div>
  );
}