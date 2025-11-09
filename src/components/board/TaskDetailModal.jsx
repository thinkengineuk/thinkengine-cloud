import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Calendar, User, Eye, Tag, CheckSquare, Paperclip, MessageSquare } from "lucide-react";
import { Task } from "@/entities/Task";
import { User as UserEntity } from "@/entities/User";
import { SendEmail } from "@/integrations/Core";

import TaskDetailHeader from "./task-detail/TaskDetailHeader";
import TaskDetailSidebar from "./task-detail/TaskDetailSidebar";
import TaskDetailMain from "./task-detail/TaskDetailMain";

export default function TaskDetailModal({ task, onClose, onRefresh }) {
  const [taskData, setTaskData] = useState(task);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setTaskData(task);
  }, [task]);

  const handleUpdate = async (updates) => {
    const updatedData = { ...taskData, ...updates };
    await Task.update(task.id, updates);
    setTaskData(updatedData);
    onRefresh();
  };

  const handleAssign = async (email) => {
    await handleUpdate({ assigned_to: email });
    
    await SendEmail({
      to: email,
      subject: `You've been assigned to: ${taskData.title}`,
      body: `You have been assigned to the task "${taskData.title}". Please check the ThinkEngine Task Management system for details.`
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0">
        <div className="flex flex-col h-full">
          <TaskDetailHeader task={taskData} onClose={onClose} onUpdate={handleUpdate} />
          
          <div className="flex-1 flex overflow-hidden">
            <TaskDetailMain 
              task={taskData} 
              onUpdate={handleUpdate}
              onRefresh={onRefresh}
            />
            
            <TaskDetailSidebar 
              task={taskData}
              onUpdate={handleUpdate}
              onAssign={handleAssign}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}