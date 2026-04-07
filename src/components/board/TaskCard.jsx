import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, CheckCircle2, Clock, AlertCircle, CheckCircle, Eye, MoreVertical, MessageSquare, Paperclip, CheckSquare } from "lucide-react";
import { format, isToday, isPast, startOfDay } from "date-fns";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const getTagColor = (tag) => {
  const colors = [
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-purple-100 text-purple-700 border-purple-200',
    'bg-green-100 text-green-700 border-green-200',
    'bg-orange-100 text-orange-700 border-orange-200',
    'bg-pink-100 text-pink-700 border-pink-200',
    'bg-cyan-100 text-cyan-700 border-cyan-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-teal-100 text-teal-700 border-teal-200',
  ];
  
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// OPTIMIZATION: Memoized component to prevent unnecessary re-renders
// Only re-renders when task or usersMap props change
const TaskCard = React.memo(({ task, usersMap, onClick, isDragging, onToggleTaskComplete, allColumns, onMoveTask, counts }) => {
  // OPTIMIZATION: Get assigned user from passed usersMap instead of fetching
  // This avoids redundant API calls and improves performance
  const assignedUser = task.assigned_to ? usersMap[task.assigned_to] : null;

  const priorityColors = {
    low: 'bg-blue-100 text-blue-700 border-blue-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    high: 'bg-red-100 text-red-700 border-red-200',
  };

  const isCompleted = task.status === 'completed';

  // Check if any timer is currently running on this task
  const isTimerRunning = (task.time_entries || []).some(e => !e.ended_at);

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return format(date, 'MMM d');
    } catch (error) {
      return null;
    }
  };

  const getDueStatus = () => {
    if (!task.due_date || isCompleted) return null;
    
    try {
      const dueDate = new Date(task.due_date);
      if (isNaN(dueDate.getTime())) return null;
      
      const today = startOfDay(new Date());
      const due = startOfDay(dueDate);
      
      if (due < today) {
        return 'overdue';
      } else if (isToday(dueDate)) {
        return 'today';
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const formattedDueDate = formatDate(task.due_date);
  const dueStatus = getDueStatus();

  return (
    <Card
      className={`group relative cursor-pointer hover:shadow-lg transition-shadow duration-150 border-slate-200 ${
        isDragging ? 'shadow-2xl rotate-2 opacity-50' : ''
      } ${isCompleted ? 'bg-slate-50 opacity-75' : ''} ${
        dueStatus === 'overdue' ? 'bg-orange-50 border-orange-200' : ''
      } ${dueStatus === 'today' ? 'bg-blue-50 border-blue-200' : ''}`}
    >
      {allColumns && allColumns.length > 0 && onMoveTask && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 left-2 h-7 w-7 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                Move to...
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {allColumns.map((col) => (
                    <DropdownMenuItem
                      key={col.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveTask(task.id, col.id);
                      }}
                    >
                      {col.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {!isCompleted && onToggleTaskComplete && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 text-slate-400 hover:text-green-600 hover:bg-green-50 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => {
            e.stopPropagation();
            onToggleTaskComplete(task.id);
          }}
        >
          <CheckCircle className="h-4 w-4" />
        </Button>
      )}
      <CardContent className="p-4 space-y-3" onClick={onClick}>
        {dueStatus && !isCompleted && (
          <div className="flex items-center gap-2 pb-2">
            {dueStatus === 'overdue' && (
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 border flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Overdue
              </Badge>
            )}
            {dueStatus === 'today' && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 border flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Due today
              </Badge>
            )}
          </div>
        )}
        
        {isCompleted && (
          <div className="flex items-center gap-2 pb-2">
            <Badge className="bg-green-100 text-green-700 border-green-200 border flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Completed
            </Badge>
          </div>
        )}

        {isTimerRunning && !isCompleted && (
          <div className="flex items-center gap-1.5 pb-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span className="text-xs font-medium text-green-600">Timer running</span>
          </div>
        )}
        
        <p className={`text-sm font-semibold leading-snug ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
          {task.title}
        </p>

        {task.attachmentPreview && (
          <div className="w-full rounded-md overflow-hidden bg-slate-100" style={{height: '160px'}}>
            {task.attachmentPreview.type.startsWith('image/') ? (
              <img
                src={task.attachmentPreview.url}
                alt="Attachment preview"
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <video
                src={task.attachmentPreview.url}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
            )}
          </div>
        )}
        <div className="space-y-2">
          {task.description && (
            <p className={`text-sm line-clamp-2 ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
              {task.description}
            </p>
          )}
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
            {task.tags.slice(0, 3).map((tagItem, index) => (
              <Badge 
                key={index} 
                className={`${getTagColor(tagItem)} border text-xs ${isCompleted ? 'opacity-60' : ''} pointer-events-none`}
              >
                {typeof tagItem === 'object' && tagItem !== null ? tagItem.name : tagItem}
              </Badge>
            ))}
            {task.tags.length > 3 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Badge variant="outline" className={`text-xs cursor-pointer ${isCompleted ? 'opacity-60' : ''}`}>
                    +{task.tags.length - 3}
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 p-1">
                  {task.tags.slice(3).map((tagItem, index) => (
                    <DropdownMenuItem 
                      key={index} 
                      className={`flex items-center space-x-2 p-2 ${isCompleted ? 'opacity-60' : ''}`}
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Badge className={`${getTagColor(tagItem)} border text-xs pointer-events-none`}>
                        {typeof tagItem === 'object' && tagItem !== null ? tagItem.name : tagItem}
                      </Badge>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className={`flex items-center gap-3 text-xs ${isCompleted ? 'text-slate-400' : 'text-slate-500'}`}>
            {formattedDueDate && (
              <div className={`flex items-center gap-1 ${
                dueStatus === 'overdue' ? 'text-orange-700 font-semibold' : ''
              } ${dueStatus === 'today' ? 'text-blue-700 font-semibold' : ''}`}>
                <Calendar className="w-3.5 h-3.5" />
                <span>{formattedDueDate}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {counts?.comments > 0 && (
              <div className="flex items-center gap-0.5 text-slate-400">
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="text-xs">{counts.comments}</span>
              </div>
            )}
            {counts?.attachments > 0 && (
              <div className="flex items-center gap-0.5 text-slate-400">
                <Paperclip className="w-3.5 h-3.5" />
                <span className="text-xs">{counts.attachments}</span>
              </div>
            )}
            {counts?.checklists > 0 && (
              <div className="flex items-center gap-0.5 text-slate-400">
                <CheckSquare className="w-3.5 h-3.5" />
                <span className="text-xs">{counts.checklists}</span>
              </div>
            )}
            {task.watchers && task.watchers.length > 0 && (
              <div className="flex items-center gap-0.5 text-slate-400">
                <Eye className="w-3.5 h-3.5" />
                <span className="text-xs">{task.watchers.length}</span>
              </div>
            )}
            {assignedUser && (
              <Avatar className="w-7 h-7">
                {assignedUser.profile_picture_url ? (
                  <AvatarImage src={assignedUser.profile_picture_url} alt={assignedUser.full_name} />
                ) : (
                  <AvatarFallback className="text-xs bg-gradient-to-br from-blue-400 to-purple-400 text-white">
                    {assignedUser.full_name[0]?.toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
            )}
            {task.priority && !isCompleted && (
              <Badge className={`${priorityColors[task.priority]} border text-xs pointer-events-none`}>
                {task.priority}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

TaskCard.displayName = 'TaskCard';

export default TaskCard;