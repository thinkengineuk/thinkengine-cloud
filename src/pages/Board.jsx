
import React, { useState, useEffect, useCallback } from "react";
import { Board as BoardEntity } from "@/entities/Board";
import { Column } from "@/entities/Column";
import { Task } from "@/entities/Task";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ArrowLeft, Settings, Filter, Tag, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import BoardColumn from "../components/board/BoardColumn";
import CreateColumnDialog from "../components/board/CreateColumnDialog";
import TaskDetailModal from "../components/board/task-detail/TaskDetailModal";
import BoardSettingsModal from "../components/board/BoardSettingsModal";
import TagManagementModal from "../components/board/TagManagementModal";
import TwoFactorAuthScreen from "../components/board/TwoFactorAuthScreen";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Function to generate consistent color for a tag
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

export default function BoardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const boardId = urlParams.get('id');
  const taskIdFromUrl = urlParams.get('taskId');

  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [allTags, setAllTags] = useState([]);
  const [filterMember, setFilterMember] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const loadBoard = useCallback(async () => {
    if (!boardId) {
      setError("No board ID provided");
      setLoading(false);
      setCheckingAccess(false);
      return;
    }

    try {
      // OPTIMIZATION: Fetch all data in parallel for faster page load
      // Reduces total loading time by making concurrent requests
      const [boardData, columnsData, tasksData, allUsers] = await Promise.all([
        BoardEntity.filter({ id: boardId }), // Renamed to BoardEntity to avoid conflict with local board variable
        Column.filter({ board_id: boardId }, "position"),
        Task.filter({ board_id: boardId }, "position"),
        User.list()
      ]);
      
      if (boardData.length === 0) {
        navigate(createPageUrl("Dashboard"));
        return;
      }

      const fetchedBoard = boardData[0];
      setBoard(fetchedBoard);
      setColumns(columnsData);
      
      // OPTIMIZATION: Build usersMap for O(1) user lookups
      const usersByEmail = {};
      allUsers.forEach(u => {
        usersByEmail[u.email] = u;
      });
      setUsersMap(usersByEmail);
      setUsers(allUsers);
      
      // Deduplicate tasks by ID
      const uniqueTasks = [];
      const seenIds = new Set();
      
      for (const task of tasksData) {
        if (!seenIds.has(task.id)) {
          seenIds.add(task.id);
          uniqueTasks.push(task);
        }
      }
      
      setAllTasks(uniqueTasks);

      const tagsSet = new Set();
      uniqueTasks.forEach(task => {
        if (task.tags) {
          task.tags.forEach(tag => {
            tagsSet.add(tag);
          });
        }
      });
      
      setAllTags(Array.from(tagsSet).sort());

      if (taskIdFromUrl) {
        const taskToOpen = uniqueTasks.find(t => t.id === taskIdFromUrl);
        if (taskToOpen) {
          setSelectedTask(taskToOpen);
        }
      }

      // Check if this is "Ben Tasks" board and if access has been granted today
      if (fetchedBoard.name === "Ben Tasks") {
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const lastAccessDate = sessionStorage.getItem(`board_access_${boardId}`);
        setHasAccess(lastAccessDate === today);
      } else {
        setHasAccess(true); // Other boards don't require 2FA
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setCheckingAccess(false);
    }
  }, [boardId, taskIdFromUrl, navigate]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard, location.pathname]);

  useEffect(() => {
    let filtered = [...allTasks];
    
    if (filterMember !== "all") {
      filtered = filtered.filter(task => task.assigned_to === filterMember);
    }
    
    if (filterTag !== "all") {
      filtered = filtered.filter(task => 
        task.tags && task.tags.includes(filterTag)
      );
    }

    if (filterPriority !== "all") {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.title?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query)
      );
    }
    
    setTasks(filtered);
  }, [filterMember, filterTag, filterPriority, searchQuery, allTasks]);

  const handleCreateColumn = async (columnData) => {
    const position = columns.length;
    await Column.create({ ...columnData, board_id: boardId, position });
    setShowColumnDialog(false);
    loadBoard();
  };

  const handleToggleTaskComplete = async (taskId) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    const completedColumn = columns.find(col => col.name.toLowerCase() === 'completed');
    if (!completedColumn) return;

    await Task.update(taskId, { status: 'completed', column_id: completedColumn.id });
    loadBoard();
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId, type } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    if (type === 'column') {
      const reorderedColumns = Array.from(columns);
      const [movedColumn] = reorderedColumns.splice(source.index, 1);
      reorderedColumns.splice(destination.index, 0, movedColumn);
      
      setColumns(reorderedColumns);

      (async () => {
        try {
          const updates = reorderedColumns.map((col, index) => 
            Column.update(col.id, { position: index })
          );
          await Promise.all(updates);
        } catch (error) {
          console.error('Error updating column positions:', error);
          loadBoard();
        }
      })();
      
      return;
    }

    const taskId = draggableId;
    const sourceColumnId = source.droppableId;
    const destColumnId = destination.droppableId;

    // Switch both columns to manual sort mode to prevent glitching
    localStorage.setItem(`column-${destColumnId}-sort`, 'manual');
    if (sourceColumnId !== destColumnId) {
      localStorage.setItem(`column-${sourceColumnId}-sort`, 'manual');
    }
    window.dispatchEvent(new Event('sort-change'));

    // Get all tasks without pre-sorting - BoardColumn handles its own sorting
    const sourceColumnTasks = allTasks.filter(t => t.column_id === sourceColumnId);
    const destColumnTasks = allTasks.filter(t => t.column_id === destColumnId);

    // Find the dragged task
    const draggedTask = allTasks.find(t => t.id === taskId);
    if (!draggedTask) return;

    // Remove dragged task from source
    const newSourceTasks = sourceColumnTasks.filter(t => t.id !== taskId);
    
    // Add to destination at the right position
    let newDestTasks = [...destColumnTasks];
    if (sourceColumnId === destColumnId) {
      newDestTasks = newSourceTasks;
    } else {
      newDestTasks = newDestTasks.filter(t => t.id !== taskId);
    }
    newDestTasks.splice(destination.index, 0, draggedTask);

    // Check if moving to/from completed column
    const destColumn = columns.find(col => col.id === destColumnId);
    let newStatus = draggedTask.status;
    if (destColumn?.name.toLowerCase() === 'completed' && draggedTask.status !== 'completed') {
      newStatus = 'completed';
    } else if (draggedTask.status === 'completed' && destColumn?.name.toLowerCase() !== 'completed') {
      newStatus = 'active';
    }

    // Create updates array with recalculated positions
    const tasksToUpdate = [];
    
    // Update positions in destination column
    newDestTasks.forEach((task, index) => {
      tasksToUpdate.push({
        id: task.id,
        updates: {
          column_id: destColumnId,
          position: index,
          ...(task.id === taskId && newStatus !== draggedTask.status ? { status: newStatus } : {})
        }
      });
    });

    // If different columns, update positions in source column too
    if (sourceColumnId !== destColumnId) {
      newSourceTasks.forEach((task, index) => {
        tasksToUpdate.push({
          id: task.id,
          updates: { position: index }
        });
      });
    }

    // Optimistically update UI
    const updatedAllTasks = allTasks.map(task => {
      const update = tasksToUpdate.find(u => u.id === task.id);
      if (update) {
        return { ...task, ...update.updates };
      }
      return task;
    });
    
    setAllTasks(updatedAllTasks);

    // Batch update database
    (async () => {
      try {
        const dbUpdates = tasksToUpdate.map(({ id, updates }) => 
          Task.update(id, updates)
        );
        await Promise.all(dbUpdates);
      } catch (error) {
        console.error('Error updating tasks:', error);
        loadBoard();
      }
    })();
  };

  if (loading || checkingAccess) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-600">Loading board...</div>
      </div>
    );
  }

  // Show 2FA screen if this is "Ben Tasks" and user hasn't been granted access
  if (board && board.name === "Ben Tasks" && !hasAccess) {
    return (
      <TwoFactorAuthScreen
        boardId={boardId}
        boardName={board.name}
        onAccessGranted={() => {
          setHasAccess(true);
        }}
      />
    );
  }

  if (error || !board) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <div className="text-slate-600">{error || "Board not found"}</div>
        <Button onClick={() => navigate(createPageUrl("Dashboard"))}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const hasActiveFilters = filterMember !== "all" || filterTag !== "all" || filterPriority !== "all" || searchQuery.trim();

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500">
      <div className="bg-white border-b border-slate-200 px-3 md:px-6 py-3 md:py-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl("Dashboard"))}
              className="hover:bg-slate-100 flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-slate-900 truncate">{board.name}</h1>
              {board.description && (
                <p className="text-xs md:text-sm text-slate-600 truncate">{board.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowTagModal(true)}
              size="sm"
              className="hidden md:flex"
            >
              <Tag className="w-4 h-4 mr-2" />
              Manage Tags
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowSettingsModal(true)}
              size="sm"
            >
              <Settings className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Settings</span>
            </Button>
            <Button
              onClick={() => setShowColumnDialog(true)}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
              size="sm"
            >
              <Plus className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Add Column</span>
            </Button>
          </div>
        </div>

        {/* Mobile: Collapsible Filters */}
        <div className="md:hidden">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">
                Filters {hasActiveFilters && <span className="text-teal-600">({
                  [filterMember !== "all", filterTag !== "all", filterPriority !== "all", searchQuery.trim()].filter(Boolean).length
                })</span>}
              </span>
            </div>
            {showFilters ? (
              <ChevronUp className="w-4 h-4 text-slate-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {showFilters && (
            <div className="mt-2 space-y-2 pb-2">
              <div className="grid grid-cols-2 gap-2">
                <Select value={filterMember} onValueChange={setFilterMember}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="All members" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All members</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.email}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="All tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tags</SelectItem>
                
                  {(() => {
                    const miscTagsList = ['HAND OVER', 'Handover', 'HOW TO\'s', 'How To', 'Partners', 'Project Work', 'Tech Projects'];
                    
                    const clientTags = allTags.filter(tag => 
                      !['HIGH', 'MEDIUM', 'LOW'].includes(tag.toUpperCase()) &&
                      !miscTagsList.some(miscTag => miscTag.toLowerCase() === tag.toLowerCase())
                    ).sort();
                    
                    return clientTags.length > 0 ? (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50">
                          Clients
                        </div>
                        {clientTags.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded ${getTagColor(tag).split(' ')[0]}`}></div>
                              {tag}
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    ) : null;
                  })()}
                  
                  {(() => {
                    const miscTagsList = ['HAND OVER', 'Handover', 'HOW TO\'s', 'How To', 'Partners', 'Project Work', 'Tech Projects'];
                    const miscTags = allTags.filter(tag => 
                      miscTagsList.some(miscTag => miscTag.toLowerCase() === tag.toLowerCase())
                    ).sort();
                    
                    return miscTags.length > 0 ? (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50">
                          Misc
                        </div>
                        {miscTags.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded ${getTagColor(tag).split(' ')[0]}`}></div>
                              {tag}
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    ) : null;
                  })()}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterMember("all");
                    setFilterTag("all");
                    setFilterPriority("all");
                    setSearchQuery("");
                  }}
                  className="w-full text-slate-600 text-xs h-8"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Desktop: Always Visible Filters */}
        <div className="hidden md:flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter className="w-4 h-4 text-slate-600" />
            <span className="text-xs md:text-sm font-medium text-slate-700">Filters:</span>
          </div>
          
          <div className="grid grid-cols-2 md:flex gap-2 flex-1">
            <Select value={filterMember} onValueChange={setFilterMember}>
              <SelectTrigger className="text-xs md:text-sm h-9">
                <SelectValue placeholder="All members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All members</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.email}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="text-xs md:text-sm h-9">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="text-xs md:text-sm h-9 col-span-2 md:col-span-1">
                <SelectValue placeholder="All tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
              
                {(() => {
                  const miscTagsList = ['HAND OVER', 'Handover', 'HOW TO\'s', 'How To', 'Partners', 'Project Work', 'Tech Projects'];
                  
                  const clientTags = allTags.filter(tag => 
                    !['HIGH', 'MEDIUM', 'LOW'].includes(tag.toUpperCase()) &&
                    !miscTagsList.some(miscTag => miscTag.toLowerCase() === tag.toLowerCase())
                  ).sort();
                  
                  return clientTags.length > 0 ? (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50">
                        Clients
                      </div>
                      {clientTags.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded ${getTagColor(tag).split(' ')[0]}`}></div>
                            {tag}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  ) : null;
                })()}
                
                {(() => {
                  const miscTagsList = ['HAND OVER', 'Handover', 'HOW TO\'s', 'How To', 'Partners', 'Project Work', 'Tech Projects'];
                  const miscTags = allTags.filter(tag => 
                    miscTagsList.some(miscTag => miscTag.toLowerCase() === tag.toLowerCase())
                  ).sort();
                  
                  return miscTags.length > 0 ? (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50">
                        Misc
                      </div>
                      {miscTags.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded ${getTagColor(tag).split(' ')[0]}`}></div>
                            {tag}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  ) : null;
                })()}
              </SelectContent>
            </Select>
          </div>

          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="pl-9 h-9 text-sm"
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterMember("all");
                setFilterTag("all");
                setFilterPriority("all");
                setSearchQuery("");
              }}
              className="text-slate-600 text-xs md:text-sm h-9"
            >
              Clear all
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-3 md:p-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="board" direction="horizontal" type="column">
            {(provided) => (
              <div 
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-6 h-full min-w-max"
              >
                {columns.map((column, index) => (
                  <Draggable key={column.id} draggableId={column.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                      >
                        <BoardColumn
                          column={column}
                          tasks={tasks.filter(t => t.column_id === column.id)}
                          users={users}
                          usersMap={usersMap}
                          onTaskClick={setSelectedTask}
                          onRefresh={loadBoard}
                          dragHandleProps={provided.dragHandleProps}
                          isDragging={snapshot.isDragging}
                          onToggleTaskComplete={handleToggleTaskComplete}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <CreateColumnDialog
        open={showColumnDialog}
        onOpenChange={setShowColumnDialog}
        onSubmit={handleCreateColumn}
      />

      {showSettingsModal && (
        <BoardSettingsModal
          boardId={boardId}
          open={showSettingsModal}
          onOpenChange={setShowSettingsModal}
          onRefresh={loadBoard}
        />
      )}

      {showTagModal && (
        <TagManagementModal
          boardId={boardId}
          open={showTagModal}
          onOpenChange={setShowTagModal}
          onRefresh={loadBoard}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          boardId={boardId}
          onClose={() => setSelectedTask(null)}
          onRefresh={loadBoard}
        />
      )}
    </div>
  );
}
