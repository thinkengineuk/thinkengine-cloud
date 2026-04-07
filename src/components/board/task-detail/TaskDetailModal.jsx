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
import { buildAssignedEmail, buildWatcherEmail } from "@/utils/emailTemplates";
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

  // Update URL when task opens, restore when closed
  useEffect(() => {
    if (!task?.id || !boardId) return;
    const originalUrl = window.location.href;
    const taskUrl = `${window.location.origin}/Board?id=${boardId}&taskId=${task.id}`;
    window.history.replaceState(null, '', taskUrl);
    return () => {
      window.history.replaceState(null, '', originalUrl);
    };
  }, [task?.id, boardId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await listAllAppUsers();
        setAllUsers(response.data?.users || []);
      } catch {
        // ignore
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

    // Don't email yourself
    if (email === currentUser?.email) return;

    const assignedUser = allUsers.find(u => u.email === email);
    const taskUrl = `${window.location.origin}/Board?id=${taskData.board_id}&taskId=${taskData.id}`;
    const boardDetails = await Board.filter({ id: taskData.board_id });
    const board = boardDetails[0];

    const htmlBody = buildAssignedEmail({
      recipientName: assignedUser?.full_name,
      assignerName: currentUser?.full_name,
      taskTitle: taskData.title,
      boardName: board?.name,
      dueDate: taskData.due_date,
      taskUrl,
    });

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

      // Don't email yourself
      if (watcherEmail !== currentUser?.email) {
        const watcherUser = allUsers.find(u => u.email === watcherEmail);
        const taskUrl = `${window.location.origin}/Board?id=${taskData.board_id}&taskId=${taskData.id}`;
        const boardDetails = await Board.filter({ id: taskData.board_id });
        const board = boardDetails[0];

        const htmlBody = buildWatcherEmail({
          recipientName: watcherUser?.full_name,
          adderName: currentUser?.full_name,
          taskTitle: taskData.title,
          boardName: board?.name,
          taskUrl,
        });

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