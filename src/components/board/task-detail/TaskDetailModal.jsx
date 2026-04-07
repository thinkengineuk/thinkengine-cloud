import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Task } from "@/entities/Task";
import { User as UserEntity } from "@/entities/User";
import { Column } from "@/entities/Column";
import { Board } from "@/entities/Board";
import { SendEmail } from "@/integrations/Core";
import { ActivityLog } from "@/entities/ActivityLog";
import { format } from "date-fns";
import { listAllAppUsers } from "@/functions/listAllAppUsers";

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
      try {
        const { users } = await listAllAppUsers();
        setAllUsers(users || []);
      } catch {
        const users = await UserEntity.list();
        setAllUsers(users);
      }
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
    
    const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>You've been assigned to a task</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);border-radius:10px 10px 0 0;padding:28px 32px;text-align:center;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;color:rgba(255,255,255,0.7);text-transform:uppercase;margin-bottom:6px;">TASKFLOW</div>
            <div style="font-size:22px;font-weight:700;color:#ffffff;">You've been assigned to a task</div>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <p style="font-size:15px;color:#1e293b;margin:0 0 12px 0;">Hi ${assignedUser?.full_name || 'there'},</p>
            <div style="font-size:15px;color:#475569;line-height:1.6;margin-bottom:20px;">
              <strong>${currentUser?.full_name}</strong> assigned you to the task <strong>${taskData.title}</strong> in the <strong>${board?.name}</strong> project.
              ${taskData.due_date ? `<br/><br/>Due: <strong>${format(new Date(taskData.due_date), 'MMMM d, yyyy')}</strong>` : ''}
            </div>
            <div style="text-align:center;margin:28px 0 8px 0;">
              <a href="${taskUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:7px;font-weight:600;font-size:15px;">View Task &amp; Reply &#8594;</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;padding:18px 32px;text-align:center;">
            <div style="font-size:12px;color:#94a3b8;">TaskFlow Task Management &middot; Automated Message</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
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
      
      const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>You're now watching a task</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);border-radius:10px 10px 0 0;padding:28px 32px;text-align:center;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;color:rgba(255,255,255,0.7);text-transform:uppercase;margin-bottom:6px;">TASKFLOW</div>
            <div style="font-size:22px;font-weight:700;color:#ffffff;">You're now watching a task</div>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <p style="font-size:15px;color:#1e293b;margin:0 0 12px 0;">Hi ${watcherUser?.full_name || 'there'},</p>
            <div style="font-size:15px;color:#475569;line-height:1.6;margin-bottom:20px;">
              <strong>${currentUser?.full_name}</strong> added you as a watcher to the task <strong>${taskData.title}</strong> in the <strong>${board?.name}</strong> project.<br/><br/>You'll receive updates whenever this task is modified or commented on.
            </div>
            <div style="text-align:center;margin:28px 0 8px 0;">
              <a href="${taskUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:7px;font-weight:600;font-size:15px;">View Task &amp; Reply &#8594;</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;padding:18px 32px;text-align:center;">
            <div style="font-size:12px;color:#94a3b8;">TaskFlow Task Management &middot; Automated Message</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
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