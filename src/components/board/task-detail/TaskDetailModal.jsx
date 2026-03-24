import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Task } from "@/entities/Task";
import { User as UserEntity } from "@/entities/User";
import { Column } from "@/entities/Column";
import { Board } from "@/entities/Board"; // Added import for Board
import { SendEmail } from "@/integrations/Core";
import { ActivityLog } from "@/entities/ActivityLog";
import { format } from "date-fns"; // Added import for date-fns format

import TaskDetailHeader from "./TaskDetailHeader";
import TaskDetailSidebar from "./TaskDetailSidebar";
import TaskDetailMain from "./TaskDetailMain";

export default function TaskDetailModal({ task, boardId, onClose, onRefresh }) {
  const [taskData, setTaskData] = useState(task);
  const [allUsers, setAllUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    setTaskData(task);
  }, [task]);

  useEffect(() => {
    const fetchData = async () => {
      const users = await UserEntity.list();
      setAllUsers(users);
      const me = await UserEntity.me();
      setCurrentUser(me);
    };
    fetchData();
  }, []);

  const handleUpdate = async (updates) => {
    let effectiveUpdates = { ...updates };

    await Task.update(taskData.id, updates);

    if (updates.status === 'completed') {
      const allColumns = await Column.filter({ board_id: taskData.board_id });
      const completedColumn = allColumns.find(col => col.name.toLowerCase() === 'completed');
      
      if (completedColumn && taskData.column_id !== completedColumn.id) {
        await Task.update(taskData.id, { column_id: completedColumn.id });
        effectiveUpdates.column_id = completedColumn.id;
      }
    }
    
    setTaskData(prevData => ({ ...prevData, ...effectiveUpdates }));
    onRefresh();
  };

  const handleAssign = async (email) => {
    await handleUpdate({ assigned_to: email });
    
    const assignedUser = allUsers.find(u => u.email === email);
    const taskUrl = `${window.location.origin}/Board?id=${taskData.board_id}&taskId=${taskData.id}`;
    
    // Get board details
    const boardDetails = await Board.filter({ id: taskData.board_id });
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
      <h2 class="title">You've been assigned to a task</h2>
      <p class="greeting">Hello ${assignedUser?.full_name || 'there'},</p>
      <p class="notification">
        <strong>${currentUser?.full_name}</strong> assigned you to the task 
        <a href="${taskUrl}" class="task-link">${taskData.title}</a> 
        in the <strong>${board?.name}</strong> project.
      </p>
      <div class="task-info">
        <div class="task-title">${taskData.title}</div>
        <div class="task-board">Project: ${board?.name}</div>
        ${taskData.due_date ? `<div style="color: #64748b; font-size: 14px; margin-top: 8px;">Due: ${format(new Date(taskData.due_date), 'MMMM d, yyyy')}</div>` : ''}
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
      to: email,
      subject: `You've been assigned to "${taskData.title}"`,
      body: htmlBody,
    });

    await ActivityLog.create({
      task_id: taskData.id,
      action_type: 'assigned',
      action_description: `${currentUser?.full_name} assigned this task to ${assignedUser?.full_name}`,
      user_email: currentUser?.email,
    });
  };

  const handleAddWatcher = async (watcherEmail) => {
    const currentWatchers = taskData.watchers || [];
    if (!currentWatchers.includes(watcherEmail)) {
      const updatedWatchers = [...currentWatchers, watcherEmail];
      await handleUpdate({ watchers: updatedWatchers });

      const watcherUser = allUsers.find(u => u.email === watcherEmail);
      const taskUrl = `${window.location.origin}/Board?id=${taskData.board_id}&taskId=${taskData.id}`;
      
      // Get board details
      const boardDetails = await Board.filter({ id: taskData.board_id });
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
    .info-box { background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 4px; color: #065f46; }
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
      <h2 class="title">You're now watching a task</h2>
      <p class="greeting">Hello ${watcherUser?.full_name || 'there'},</p>
      <p class="notification">
        <strong>${currentUser?.full_name}</strong> added you as a watcher to the task 
        <a href="${taskUrl}" class="task-link">${taskData.title}</a> 
        in the <strong>${board?.name}</strong> project.
      </p>
      <div class="info-box">
        You'll receive updates whenever this task is modified or commented on.
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
        to: watcherEmail,
        subject: `You're now watching "${taskData.title}"`,
        body: htmlBody,
      });

      await ActivityLog.create({
        task_id: taskData.id,
        action_type: 'updated',
        action_description: `${currentUser?.full_name} added ${watcherUser?.full_name} as a watcher`,
        user_email: currentUser?.email,
      });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[100dvh] md:h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        <TaskDetailHeader 
          task={taskData}
          boardId={boardId}
          onClose={onClose} 
          onUpdate={handleUpdate}
          onRefresh={onRefresh}
        />
          
        {/* Mobile: Tabs Layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="lg:hidden flex-1 flex flex-col overflow-hidden">
            <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="properties">Properties</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="flex-1 overflow-y-auto m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <TaskDetailMain 
                  task={taskData} 
                  allUsers={allUsers}
                  currentUser={currentUser}
                  onUpdate={handleUpdate}
                  onRefresh={onRefresh}
                />
              </TabsContent>
              
              <TabsContent value="properties" className="flex-1 overflow-y-auto m-0 data-[state=active]:flex data-[state=active]:flex-col">
                <TaskDetailSidebar 
                  task={taskData}
                  allUsers={allUsers}
                  currentUser={currentUser}
                  onUpdate={handleUpdate}
                  onAssign={handleAssign}
                  onAddWatcher={handleAddWatcher}
                  onClose={onClose}
                  onRefresh={onRefresh}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Desktop: Side-by-side Layout */}
          <div className="hidden lg:flex flex-1 overflow-hidden">
            <TaskDetailMain 
              task={taskData} 
              allUsers={allUsers}
              currentUser={currentUser}
              onUpdate={handleUpdate}
              onRefresh={onRefresh}
            />
              
            <TaskDetailSidebar 
              task={taskData}
              allUsers={allUsers}
              currentUser={currentUser}
              onUpdate={handleUpdate}
              onAssign={handleAssign}
              onAddWatcher={handleAddWatcher}
              onClose={onClose}
              onRefresh={onRefresh}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}