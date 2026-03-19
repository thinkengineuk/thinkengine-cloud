import React, { useState, useEffect } from "react";
import { Board } from "@/entities/Board";
import { Task } from "@/entities/Task";
import { ActivityLog } from "@/entities/ActivityLog";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, CheckSquare, MessageSquare, FolderKanban } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import CreateBoardDialog from "../components/dashboard/CreateBoardDialog";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [boardsMap, setBoardsMap] = useState({});
  const [tasks, setTasks] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [usersMap, setUsersMap] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // OPTIMIZATION: Fetch current user, all users, and all boards in parallel.
    // This reduces total loading time by making concurrent requests instead of sequential.
    const currentUser = await User.me();
    const [allUsers, allBoards] = await Promise.all([
      currentUser.role === 'admin' ? User.list() : Promise.resolve([currentUser]),
      Board.list("-created_date")
    ]);
    
    setUser(currentUser);
    
    // OPTIMIZATION: Build usersMap once from fetched users.
    // This allows O(1) lookups throughout the component instead of O(n) searches.
    const usersByEmail = {};
    allUsers.forEach(u => {
      usersByEmail[u.email] = u;
    });
    setUsersMap(usersByEmail);
    
    const userBoards = allBoards.filter(board => 
      board.members?.includes(currentUser.email)
    );
    setBoards(userBoards);
    
    // Create boards map for quick lookup
    const bMap = {};
    userBoards.forEach(b => {
      bMap[b.id] = b;
    });
    setBoardsMap(bMap);

    // OPTIMIZATION: Fetch user's active tasks, ALL tasks (for activity filtering), and recent activities in parallel.
    const [currentUserActiveTasks, allSystemTasks, allActivityLogs] = await Promise.all([
      Task.filter({ assigned_to: currentUser.email, status: 'active' }, "-created_date"),
      Task.filter({}, "-created_date"), // Fetch all tasks to determine relevantTaskIds for activity filtering
      ActivityLog.list("-created_date", 10)
    ]);
    
    // Sort by priority: high > medium > low, then by due_date
    const sortedTasks = currentUserActiveTasks.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      // If same priority, sort by due date
      if (a.due_date && b.due_date) {
        return new Date(a.due_date) - new Date(b.due_date);
      }
      return 0;
    });
    
    setTasks(sortedTasks);

    // Filter relevant activity based on all tasks where the user is assigned, watching, or created
    const relevantTaskIds = allSystemTasks
      .filter(t => 
        t.assigned_to === currentUser.email || 
        t.watchers?.includes(currentUser.email) ||
        t.created_by === currentUser.email
      )
      .map(t => t.id);
    
    const filteredActivity = allActivityLogs.filter(activity => 
      relevantTaskIds.includes(activity.task_id)
    );
    
    setRecentActivity(filteredActivity);
  };

  const handleCreateBoard = async (boardData) => {
    await Board.create(boardData);
    setShowCreateDialog(false);
    loadData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const firstName = user?.full_name?.split(' ')[0] || user?.full_name || 'User';

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

  const filteredBoards = boards.filter(board =>
    board.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    board.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const priorityColors = {
    low: 'bg-blue-100 text-blue-700 border-blue-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    high: 'bg-red-100 text-red-700 border-red-200',
  };

  const handleTaskClick = async (task) => {
    navigate(`${createPageUrl("Board")}?id=${task.board_id}&taskId=${task.id}`);
  };

  const handleActivityClick = async (activity) => {
    const task = await Task.filter({ id: activity.task_id });
    if (task.length > 0) {
      navigate(`${createPageUrl("Board")}?id=${task[0].board_id}&taskId=${activity.task_id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center text-white space-y-2 py-8">
          <p className="text-sm opacity-90">{format(new Date(), 'EEEE, MMMM d')}</p>
          <h1 className="text-4xl font-bold">{getGreeting()}, {firstName}</h1>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks, projects, and more..."
              className="pl-12 h-14 bg-white shadow-lg border-none rounded-full text-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tasks Section */}
          <div className="lg:col-span-2">
            <Card className="border-none shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-teal-600" />
                  <CardTitle>Tasks</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <CheckSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No tasks assigned</p>
                  </div>
                ) : (
                  tasks.slice(0, 6).map((task) => {
                    const board = boardsMap[task.board_id];
                    const assignedUser = usersMap[task.assigned_to];
                    
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                        onClick={() => handleTaskClick(task)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{task.title}</p>
                          {board && (
                            <p className="text-xs text-slate-500">{board.name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {task.due_date && (
                            <Badge variant="outline" className="text-xs">
                              {formatDate(task.due_date)}
                            </Badge>
                          )}
                          {task.priority && (
                            <Badge className={`${priorityColors[task.priority]} border text-xs`}>
                              {task.priority}
                            </Badge>
                          )}
                          {assignedUser && (
                            <Avatar className="w-7 h-7">
                              {assignedUser.profile_picture_url ? (
                                <AvatarImage src={assignedUser.profile_picture_url} alt={assignedUser.full_name} />
                              ) : (
                                <AvatarFallback className="text-xs bg-gradient-to-br from-teal-400 to-cyan-400 text-white">
                                  {assignedUser.full_name[0]?.toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Projects Section */}
            <Card className="border-none shadow-xl mt-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-teal-600" />
                  <CardTitle>Projects</CardTitle>
                  <Badge variant="secondary">{boards.length}</Badge>
                </div>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  size="sm"
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New
                </Button>
              </CardHeader>
              <CardContent>
                {filteredBoards.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderKanban className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      {searchTerm ? "No projects found" : "No projects yet"}
                    </h3>
                    <p className="text-slate-600 mb-4">
                      {searchTerm ? "Try adjusting your search" : "Create your first project to get started"}
                    </p>
                    {!searchTerm && (
                      <Button
                        onClick={() => setShowCreateDialog(true)}
                        className="bg-gradient-to-r from-teal-600 to-cyan-600"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Project
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredBoards.map((board, index) => (
                      <motion.div
                        key={board.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => navigate(`${createPageUrl("Board")}?id=${board.id}`)}
                        className="group cursor-pointer"
                      >
                        <Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
                          <div className={`h-2 bg-gradient-to-r ${
                            board.color === 'blue' ? 'from-blue-400 to-blue-600' :
                            board.color === 'purple' ? 'from-purple-400 to-purple-600' :
                            board.color === 'green' ? 'from-green-400 to-green-600' :
                            board.color === 'orange' ? 'from-orange-400 to-orange-600' :
                            board.color === 'pink' ? 'from-pink-400 to-pink-600' :
                            board.color === 'red' ? 'from-red-400 to-red-600' :
                            board.color === 'teal' ? 'from-teal-400 to-teal-600' :
                            board.color === 'indigo' ? 'from-indigo-400 to-indigo-600' :
                            board.color === 'cyan' ? 'from-cyan-400 to-cyan-600' :
                            'from-blue-400 to-blue-600'
                          }`} />
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors mb-1">
                              {board.name}
                            </h3>
                            <p className="text-sm text-slate-600 line-clamp-2">
                              {board.description || "No description"}
                            </p>
                            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                              <span>{board.members?.length || 0} member{board.members?.length !== 1 ? 's' : ''}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Section */}
          <div className="lg:col-span-1">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-teal-600" />
                  <CardTitle>Recent Activity</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No recent activity</p>
                  </div>
                ) : (
                  recentActivity.map((activity) => {
                    const activityUser = usersMap[activity.user_email];
                    
                    return (
                      <div 
                        key={activity.id} 
                        className="flex gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                        onClick={() => handleActivityClick(activity)}
                      >
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          {activityUser?.profile_picture_url ? (
                            <AvatarImage src={activityUser.profile_picture_url} alt={activityUser.full_name} />
                          ) : (
                            <AvatarFallback className="text-xs bg-gradient-to-br from-purple-400 to-pink-400 text-white">
                              {activity.user_email?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {activity.action_description}
                          </p>
                          {activity.created_date && (
                            <p className="text-xs text-slate-400 mt-1">
                              {format(new Date(activity.created_date), 'MMM d, h:mm a')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <CreateBoardDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateBoard}
      />
    </div>
  );
}