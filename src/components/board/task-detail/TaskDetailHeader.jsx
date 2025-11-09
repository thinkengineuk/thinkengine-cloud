import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Copy, ExternalLink, MoreVertical } from "lucide-react";
import { Task } from "@/entities/Task";
import { ActivityLog } from "@/entities/ActivityLog";
import { User } from "@/entities/User";
import { deleteTask } from "@/functions/deleteTask";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function TaskDetailHeader({ task, boardId, onClose, onUpdate, onRefresh }) {
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    if (deleting) return;
    
    setDeleting(true);
    try {
      const response = await deleteTask({ taskId: task.id });
      
      if (response.data.success) {
        onClose();
        onRefresh();
      } else {
        alert('Failed to delete task: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete task: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const currentUser = await User.me();
      
      const newTask = await Task.create({
        board_id: task.board_id,
        column_id: task.column_id,
        title: `${task.title} (Copy)`,
        description: task.description,
        assigned_to: task.assigned_to,
        due_date: task.due_date,
        tags: task.tags,
        tag_colors: task.tag_colors,
        priority: task.priority,
        position: task.position + 1,
      });

      await ActivityLog.create({
        task_id: newTask.id,
        action_type: 'created',
        action_description: `${currentUser.full_name} duplicated task "${task.title}"`,
        user_email: currentUser.email,
      });

      onClose();
      onRefresh();
    } catch (error) {
      alert('Failed to duplicate task: ' + error.message);
    }
  };

  const handleCopyLink = () => {
    const taskUrl = `${window.location.origin}/Board?id=${boardId}&taskId=${task.id}`;
    navigator.clipboard.writeText(taskUrl);
    alert('Link copied to clipboard!');
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <MoreVertical className="w-5 h-5 text-slate-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 focus:text-red-600"
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex-1 min-w-0 pr-4">
            {task.title}
          </h2>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.title}"? This will permanently delete the task and all its comments, attachments, and checklists. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Task'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}