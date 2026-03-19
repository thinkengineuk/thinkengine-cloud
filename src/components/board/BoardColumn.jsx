import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Settings, Trash2, ArrowUpDown } from "lucide-react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";
import CreateTaskDialog from "./CreateTaskDialog";
import EditColumnDialog from "./EditColumnDialog";
import { Task } from "@/entities/Task";
import { Column } from "@/entities/Column";
import { SendEmail } from "@/integrations/Core";
import { ActivityLog } from "@/entities/ActivityLog";
import { User } from "@/entities/User";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { isToday, isPast, startOfDay, format } from "date-fns";
import { Board } from "@/entities/Board";
import { Checkbox } from "@/components/ui/checkbox";

const colorMap = {
  blue: { bg: 'from-blue-500 to-blue-700', light: 'bg-blue-50' },
  purple: { bg: 'from-purple-500 to-purple-700', light: 'bg-purple-50' },
  green: { bg: 'from-green-500 to-green-700', light: 'bg-green-50' },
  orange: { bg: 'from-orange-500 to-orange-700', light: 'bg-orange-50' },
  pink: { bg: 'from-pink-500 to-pink-700', light: 'bg-pink-50' },
  red: { bg: 'from-red-500 to-red-700', light: 'bg-red-50' },
  teal: { bg: 'from-teal-500 to-teal-700', light: 'bg-teal-50' },
  indigo: { bg: 'from-indigo-500 to-indigo-700', light: 'bg-indigo-50' },
  cyan: { bg: 'from-cyan-500 to-cyan-700', light: 'bg-cyan-50' },
};

export default function BoardColumn({ column, tasks, users, usersMap, onTaskClick, onRefresh, dragHandleProps, isDragging, onToggleTaskComplete, selectionMode, selectedTaskIds, onToggleTaskSelect }) {
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showEditColumn, setShowEditColumn] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Load sort preference from localStorage, default to 'due_date'
  const getSavedSortPreference = () => {
    try {
      const saved = localStorage.getItem(`column-${column.id}-sort`);
      return saved || 'due_date';
    } catch (error) {
      return 'due_date';
    }
  };
  
  const [sortBy, setSortBy] = useState(getSavedSortPreference());
  const colors = colorMap[column.color] || colorMap.blue;

  // Save sort preference whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(`column-${column.id}-sort`, sortBy);
    } catch (error) {
      console.error('Failed to save sort preference:', error);
    }
  }, [sortBy, column.id]);

  // Listen for storage changes to update sort mode
  useEffect(() => {
    const handleSortChange = () => {
      const newSort = getSavedSortPreference();
      setSortBy(newSort);
    };
    
    window.addEventListener('storage', handleSortChange);
    window.addEventListener('sort-change', handleSortChange);
    
    return () => {
      window.removeEventListener('storage', handleSortChange);
      window.removeEventListener('sort-change', handleSortChange);
    };
  }, [column.id]);

  const sortedTasks = React.useMemo(() => {
    const tasksCopy = [...tasks];
    
    // Special handling for Completed column - always show most recently completed first
    if (column.name.toLowerCase() === 'completed') {
      return tasksCopy.sort((a, b) => {
        if (!a.updated_date) return 1;
        if (!b.updated_date) return -1;
        return new Date(b.updated_date) - new Date(a.updated_date);
      });
    }
    
    // For other columns, use the selected sort preference
    if (sortBy === 'due_date') {
      return tasksCopy.sort((a, b) => {
        const getDueStatus = (task) => {
          if (!task.due_date || task.status === 'completed') return 'none';
          
          try {
            const dueDate = new Date(task.due_date);
            if (isNaN(dueDate.getTime())) return 'none';
            
            const today = startOfDay(new Date());
            const due = startOfDay(dueDate);
            
            if (due < today) return 'overdue';
            if (isToday(dueDate)) return 'today';
            return 'upcoming';
          } catch (error) {
            return 'none';
          }
        };

        const aStatus = getDueStatus(a);
        const bStatus = getDueStatus(b);

        const statusPriority = { overdue: 0, today: 1, upcoming: 2, none: 3 };
        
        if (statusPriority[aStatus] !== statusPriority[bStatus]) {
          return statusPriority[aStatus] - statusPriority[bStatus];
        }

        if (aStatus === 'upcoming' && bStatus === 'upcoming') {
          if (a.due_date && b.due_date) {
            return new Date(a.due_date) - new Date(b.due_date);
          }
        }

        if (aStatus === 'overdue' && bStatus === 'overdue') {
          if (a.due_date && b.due_date) {
            return new Date(a.due_date) - new Date(b.due_date);
          }
        }

        return 0;
      });
    } else if (sortBy === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2, undefined: 3 };
      return tasksCopy.sort((a, b) => {
        const aPriority = priorityOrder[a.priority] ?? 3;
        const bPriority = priorityOrder[b.priority] ?? 3;
        return aPriority - bPriority;
      });
    } else if (sortBy === 'title') {
      return tasksCopy.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'created') {
      return tasksCopy.sort((a, b) => {
        if (!a.created_date) return 1;
        if (!b.created_date) return -1;
        return new Date(b.created_date) - new Date(a.created_date);
      });
    } else if (sortBy === 'manual') {
      return tasksCopy.sort((a, b) => (a.position || 0) - (b.position || 0));
    }
    
    return tasksCopy;
  }, [tasks, sortBy, column.name]);

  const handleCreateTask = async (taskData) => {
    const position = tasks.length;
    const currentUser = await User.me();

    const createdTask = await Task.create({
      ...taskData,
      board_id: column.board_id,
      column_id: column.id,
      position,
    });
    setShowCreateTask(false);

    await ActivityLog.create({
      task_id: createdTask.id,
      action_type: 'created',
      action_description: `${currentUser.full_name} created task "${taskData.title}"`,
      user_email: currentUser.email
    });

    if (taskData.assigned_to) {
      const assignedUser = await User.filter({ email: taskData.assigned_to });
      const taskUrl = `${window.location.origin}/Board?id=${column.board_id}&taskId=${createdTask.id}`;
      
      const boardDetails = await Board.filter({ id: column.board_id });
      const board = boardDetails[0];
      
      const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #14b8a6 0%, #0891b2 100%); padding: 32px 24px; text-align: center; }
    .logo { font-size: 28px; font-weight: bold; color: #ffffff; margin: 0; }
    .content { padding: 32px 24px; }
    .title { font-size: 24px; font-weight: 600; color: #1e293b; margin: 0 0 24px 0; }
    .greeting { font-size: 16px; color: #475569; margin: 0 0 24px 0; }
    .notification { font-size: 16px; color: #334155; line-height: 1.6; margin: 0 0 24px 0; }
    .task-link { color: #0891b2; text-decoration: none; font-weight: 600; }
    .task-link:hover { text-decoration: underline; }
    .task-info { background-color: #f8fafc; padding: 20px; margin: 24px 0; border-radius: 8px; border: 1px solid #e2e8f0; }
    .task-title { font-size: 18px; font-weight: 600; color: #1e293b; margin: 0 0 8px 0; }
    .task-board { color: #64748b; font-size: 14px; }
    .button { display: inline-block; background: linear-gradient(135deg, #14b8a6 0%, #0891b2 100%); color: #ffffff !important; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600; margin: 24px 0; font-size: 16px; }
    .button:hover { opacity: 0.9; }
    .footer { padding: 24px; text-align: center; color: #94a3b8; font-size: 14px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">TaskFlow</h1>
    </div>
    <div class="content">
      <h2 class="title">New Task Assigned</h2>
      <p class="greeting">Hello ${assignedUser[0]?.full_name || 'there'},</p>
      <p class="notification">
        <strong>${currentUser.full_name}</strong> assigned you to a new task 
        <a href="${taskUrl}" class="task-link">${taskData.title}</a> 
        in the <strong>${board?.name}</strong> project.
      </p>
      <div class="task-info">
        <div class="task-title">${taskData.title}</div>
        <div class="task-board">Project: ${board?.name}</div>
        ${taskData.due_date ? `<div style="color: #64748b; font-size: 14px; margin-top: 8px;">Due: ${format(new Date(taskData.due_date), 'MMMM d, yyyy')}</div>` : ''}
        ${taskData.description ? `<div style="color: #475569; font-size: 14px; margin-top: 12px;">${taskData.description}</div>` : ''}
      </div>
      <a href="${taskUrl}" class="button">View Task</a>
    </div>
    <div class="footer">
      This is an automated notification from TaskFlow Task Management
    </div>
  </div>
</body>
</html>`;

      await SendEmail({
        to: taskData.assigned_to,
        subject: `New task assigned: "${taskData.title}"`,
        body: htmlBody,
      });
      
      await ActivityLog.create({
        task_id: createdTask.id,
        action_type: 'assigned',
        action_description: `${currentUser.full_name} assigned this task to ${taskData.assigned_to}`,
        user_email: currentUser.email
      });
    }

    onRefresh();
  };

  const handleEditColumn = async (columnData) => {
    await Column.update(column.id, columnData);
    setShowEditColumn(false);
    onRefresh();
  };

  const handleDeleteColumn = async () => {
    try {
      for (const task of tasks) {
        try {
          await Task.delete(task.id);
        } catch (error) {
          console.warn(`Failed to delete task ${task.id}:`, error);
        }
      }
      
      await Column.delete(column.id);
      setShowDeleteDialog(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to delete column:', error);
      alert('Failed to delete column. Please try again.');
    }
  };

  const getSortLabel = () => {
    // If the column is 'completed', it's always sorted by 'Recently Updated'
    if (column.name.toLowerCase() === 'completed') {
      return 'Recently Updated';
    }

    switch (sortBy) {
      case 'due_date': return 'Due Date';
      case 'priority': return 'Priority';
      case 'title': return 'Title';
      case 'created': return 'Created';
      case 'manual': return 'Manual Order';
      default: return 'Sort';
    }
  };

  return (
    <>
      <div className={`flex-shrink-0 w-80 ${isDragging ? 'opacity-50' : ''}`}>
        <Card className="h-full flex flex-col border-none shadow-lg overflow-hidden">
          <div 
            className={`bg-gradient-to-r ${colors.bg} px-4 py-3 transition-opacity`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1" {...dragHandleProps}>
                <GripVertical className="w-4 h-4 text-white/70 cursor-move" />
                <h3 className="font-bold text-white text-lg">{column.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-white/30 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                  {tasks.length}
                </span>
                
                {/* Conditionally render sort dropdown based on column name */}
                {column.name.toLowerCase() !== 'completed' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20">
                        <ArrowUpDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <div className="px-2 py-1.5 text-xs font-semibold text-slate-500">Sort by</div>
                      <DropdownMenuItem onClick={() => setSortBy('due_date')} className={sortBy === 'due_date' ? 'bg-slate-100' : ''}>
                        Due Date
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy('priority')} className={sortBy === 'priority' ? 'bg-slate-100' : ''}>
                        Priority
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy('title')} className={sortBy === 'title' ? 'bg-slate-100' : ''}>
                        Title (A-Z)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy('created')} className={sortBy === 'created' ? 'bg-slate-100' : ''}>
                        Recently Created
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setSortBy('manual')} className={sortBy === 'manual' ? 'bg-slate-100' : ''}>
                        Manual Order
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowEditColumn(true)}>
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Column
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Column
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <div className="text-xs text-white/70 mt-1">
              Sorted by: {getSortLabel()}
            </div>
          </div>

          <Droppable droppableId={column.id} type="task" isDropDisabled={false}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`flex-1 p-4 space-y-3 overflow-y-auto ${
                  snapshot.isDraggingOver ? colors.light : ''
                }`}
              >
                {/* Do not allow adding tasks to a 'Completed' column directly */}
                {column.name.toLowerCase() !== 'completed' && (
                  <Button
                    onClick={() => setShowCreateTask(true)}
                    variant="outline"
                    className="w-full justify-center border-dashed border-2 hover:border-slate-400 hover:bg-slate-50 text-slate-600"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add task
                  </Button>
                )}

                {sortedTasks.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={false}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.dragHandleProps}
                        {...provided.draggableProps}
                      >
                        <TaskCard
                          task={task}
                          usersMap={usersMap}
                          onClick={() => onTaskClick(task)}
                          isDragging={snapshot.isDragging}
                          onToggleTaskComplete={onToggleTaskComplete}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </Card>
      </div>

      <CreateTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        onSubmit={handleCreateTask}
        boardMembers={users} // The original outline's filter effectively returned all users, so passing `users` directly
      />

      <EditColumnDialog
        open={showEditColumn}
        onOpenChange={setShowEditColumn}
        column={column}
        onSubmit={handleEditColumn}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Column?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{column.name}"? This will permanently delete all {tasks.length} task(s) in this column. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteColumn}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Column
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}