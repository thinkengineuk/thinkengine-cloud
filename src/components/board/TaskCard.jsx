import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, CheckCircle2, Clock, AlertCircle, CheckCircle, Eye, MoreHorizontal, MessageSquare, Paperclip, CheckSquare, Link } from "lucide-react";
import { format, isToday, startOfDay } from "date-fns";
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
  return colors[Math.abs(hash) % colors.length];
};

const TaskCard = React.memo(({ task, usersMap, onClick, isDragging, onToggleTaskComplete, allColumns, onMoveTask, counts }) => {
  const assignedUser = task.assigned_to ? usersMap[task.assigned_to] : null;
  const [linkCopied, setLinkCopied] = useState(false);
  const copyTimeoutRef = useRef(null);

  const handleCopyLink = (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/Board?id=${task.board_id}&taskId=${task.id}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setLinkCopied(false), 3000);
  };

  const priorityColors = {
    low: 'bg-blue-100 text-blue-700 border-blue-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    high: 'bg-red-100 text-red-700 border-red-200',
  };

  const isCompleted = task.status === 'completed';
  const isTimerRunning = (task.time_entries || []).some(e => !e.ended_at);

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return format(date, 'do MMMM');
    } catch {
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
      if (due < today) return 'overdue';
      if (isToday(dueDate)) return 'today';
      return null;
    } catch {
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
      {assignedUser && (() => {
        const nameColorMap = {
          ben: '#3b82f6', chloe: '#ec4899', josh: '#ef4444',
          emma: '#a855f7', tom: '#f97316', karl: '#ca8a04',
          keara: '#22c55e',
        };
        const rawFirst = assignedUser.full_name?.split(' ')[0] || assignedUser.full_name;
        const firstName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1).toLowerCase();
        const nameColor = nameColorMap[rawFirst.toLowerCase()] || '#64748b';
        return (
          <div className="absolute top-3 right-3 flex flex-col items-center pointer-events-none" style={{ gap: '4px' }}>
            <Avatar className="w-7 h-7" style={{ outline: `3px solid ${nameColor}`, outlineOffset: '1px' }}>
              {assignedUser.profile_picture_url ? (
                <AvatarImage src={assignedUser.profile_picture_url} alt={assignedUser.full_name} />
              ) : (
                <AvatarFallback className="text-xs bg-gradient-to-br from-blue-400 to-purple-400 text-white">
                  {assignedUser.full_name[0]?.toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="text-[10px] font-semibold leading-none" style={{ color: nameColor }}>{firstName}</span>
          </div>
        );
      })()}
      <CardContent className="px-4 pt-3 pb-4 space-y-3" onClick={onClick}>
        {(dueStatus && !isCompleted) || isCompleted || (isTimerRunning && !isCompleted) || (task.priority && task.priority !== 'medium' && !isCompleted) ? (
          <div className="flex flex-wrap items-center gap-1.5" style={{ marginBottom: '5px' }}>
            {isCompleted && (
              <Badge className="bg-green-100 text-green-700 border-green-200 border flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Completed
              </Badge>
            )}
            {dueStatus === 'overdue' && !isCompleted && (
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 border flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Overdue
              </Badge>
            )}
            {dueStatus === 'today' && !isCompleted && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 border flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Due today
              </Badge>
            )}
            {task.priority && task.priority !== 'medium' && !isCompleted && (
              <Badge className={`${priorityColors[task.priority]} border text-xs capitalize`}>
                {task.priority} Priority
              </Badge>
            )}
            {isTimerRunning && !isCompleted && (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <span className="text-xs font-medium text-green-600">Timer running</span>
              </div>
            )}
          </div>
        ) : null}

        <p className={`text-sm font-semibold leading-snug pr-10 ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
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
          <div className={`flex items-center gap-2 text-xs ${isCompleted ? 'text-slate-400' : 'text-slate-500'}`}>
            {allColumns && allColumns.length > 0 && onMoveTask && (
              <DropdownMenu onOpenChange={(open) => { if (!open) setLinkCopied(false); }}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity -ml-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={handleCopyLink} className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    {linkCopied ? (
                      <span className="text-green-600 font-medium">Link copied!</span>
                    ) : (
                      'Copy link'
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Move to...</DropdownMenuSubTrigger>
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
          </div>
        </div>
      </CardContent>




    </Card>
  );
});

TaskCard.displayName = 'TaskCard';

export default TaskCard;