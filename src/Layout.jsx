import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, User, LogOut, BarChart2, FolderKanban, Users, Briefcase, Archive, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { User as UserEntity } from "@/entities/User";
import { Board } from "@/entities/Board";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import ProfilePictureUpload from "@/components/user/ProfilePictureUpload";

const RECENT_BOARDS_KEY = "taskflow_recent_boards";
const MAX_RECENT = 3;

function getRecentBoardIds() {
  try { return JSON.parse(localStorage.getItem(RECENT_BOARDS_KEY) || "[]"); }
  catch { return []; }
}

function recordRecentBoard(boardId) {
  const recent = getRecentBoardIds().filter(id => id !== boardId);
  recent.unshift(boardId);
  localStorage.setItem(RECENT_BOARDS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

export default function Layout({ children }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [myProjects, setMyProjects] = React.useState([]);
  const [recentBoardIds, setRecentBoardIds] = React.useState(getRecentBoardIds);

  React.useEffect(() => {
    loadUserAndProjects();
    // Track current board visit
    const params = new URLSearchParams(location.search);
    const boardId = params.get('id');
    if (boardId && location.pathname.includes('Board')) {
      recordRecentBoard(boardId);
      setRecentBoardIds(getRecentBoardIds());
    }
  }, [location.pathname, location.search]);

  const loadUserAndProjects = async () => {
    try {
      const currentUser = await UserEntity.me();
      setUser(currentUser);

      if (currentUser) {
        const allBoards = await Board.list();
        const userBoards = allBoards.filter(board =>
          board.members?.includes(currentUser.email)
        );
        setMyProjects(userBoards);
      }
    } catch (error) {
      console.error("Error loading user and projects:", error);
    }
  };

  const handleLogout = async () => {
    await UserEntity.logout();
  };

  const navigationItems = [
    {
      title: "Dashboard",
      url: createPageUrl("Dashboard"),
      icon: LayoutDashboard,
      show: true,
    },
    {
      title: "Productivity",
      url: "/Productivity",
      icon: BarChart2,
      show: user?.role === "admin",
    },
    {
      title: "Client Projects",
      url: "/ClientProjects",
      icon: FolderKanban,
      show: user?.company === "ThinkEngine",
    },
    {
      title: "Client Operations",
      url: "/ClientOperations",
      icon: Briefcase,
      show: user?.role === "admin" || user?.company === "ThinkEngine",
    },
    {
      title: "Archived Tasks",
      url: "/ArchivedTasks",
      icon: Archive,
      show: true,
    },
    {
      title: "Clients",
      url: "/Clients",
      icon: Users,
      show: user?.role === "admin",
    },
  ];

  // Extract board ID from URL search parameters for active styling
  const queryParams = new URLSearchParams(location.search);
  const activeBoardId = queryParams.get('id');

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
        <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white/80 backdrop-blur-sm">
          <SidebarHeader className="border-b border-slate-200 py-1 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center flex-1 group-data-[collapsible=icon]:hidden overflow-hidden">
                <Link to="/">
                  <img
                    src="https://media.base44.com/images/public/68dcdd68fd2e656bc4f622ca/d940d5b06_ThinkEngineCloud1.png"
                    alt="ThinkEngine Cloud"
                    className="w-full max-w-[160px] h-auto object-contain"
                  />
                </Link>
              </div>
              <div className="group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:mt-2">
                <SidebarTrigger className="hover:bg-slate-100 rounded-lg transition-colors" />
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-3">
            {/* Recent Projects - first */}
            {(() => {
              const recentProjects = recentBoardIds
                .map(id => myProjects.find(p => p.id === id))
                .filter(Boolean);
              if (recentProjects.length === 0) return null;
              return (
                <SidebarGroup>
                  <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                    Recent
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {recentProjects.map((project) => (
                        <SidebarMenuItem key={project.id}>
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl mb-1 ${
                              activeBoardId === project.id ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-sm' : ''
                            }`}
                          >
                            <Link to={`${createPageUrl("Board")}?id=${project.id}`} className="flex items-center gap-3 px-4 py-3">
                              <span className={`w-2 h-2 min-w-[0.5rem] min-h-[0.5rem] rounded-full flex-shrink-0 bg-gradient-to-r ${
                              project.color === 'blue' ? 'from-blue-400 to-blue-600' :
                              project.color === 'purple' ? 'from-purple-400 to-purple-600' :
                              project.color === 'green' ? 'from-green-400 to-green-600' :
                              project.color === 'orange' ? 'from-orange-400 to-orange-600' :
                              project.color === 'pink' ? 'from-pink-400 to-pink-600' :
                              project.color === 'red' ? 'from-red-400 to-red-600' :
                              project.color === 'teal' ? 'from-teal-400 to-teal-600' :
                              project.color === 'indigo' ? 'from-indigo-400 to-indigo-600' :
                              project.color === 'cyan' ? 'from-cyan-400 to-cyan-600' :
                              project.color === 'black' ? 'from-slate-700 to-slate-900' :
                              'from-gray-400 to-gray-600'
                            }`}></span>
                                <span className="font-medium text-sm">{project.name}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            })()}

            {/* My Projects - alphabetical */}
            {myProjects.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                  My Projects
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {[...myProjects].sort((a, b) => a.name.localeCompare(b.name)).map((project) => (
                      <SidebarMenuItem key={project.id}>
                        <SidebarMenuButton
                          asChild
                          className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl mb-1 ${
                            activeBoardId === project.id ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-sm' : ''
                          }`}
                        >
                          <Link to={`${createPageUrl("Board")}?id=${project.id}`} className="flex items-center gap-3 px-4 py-3">
                            <span className={`w-2 h-2 min-w-[0.5rem] min-h-[0.5rem] rounded-full flex-shrink-0 bg-gradient-to-r ${
                              project.color === 'blue' ? 'from-blue-400 to-blue-600' :
                              project.color === 'purple' ? 'from-purple-400 to-purple-600' :
                              project.color === 'green' ? 'from-green-400 to-green-600' :
                              project.color === 'orange' ? 'from-orange-400 to-orange-600' :
                              project.color === 'pink' ? 'from-pink-400 to-pink-600' :
                              project.color === 'red' ? 'from-red-400 to-red-600' :
                              project.color === 'teal' ? 'from-teal-400 to-teal-600' :
                              project.color === 'indigo' ? 'from-indigo-400 to-indigo-600' :
                              project.color === 'cyan' ? 'from-cyan-400 to-cyan-600' :
                              project.color === 'black' ? 'from-slate-700 to-slate-900' :
                                'from-gray-400 to-gray-600'
                              }`}></span>
                              <span className="font-medium text-sm">{project.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Navigation - second */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2 mt-2">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.filter(item => item.show).map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl mb-1 ${
                          location.pathname === item.url ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-sm' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200 p-4">
            {user?.role === 'admin' && (
              <Link
                to={createPageUrl("Users")}
                className={`flex items-center gap-3 px-4 py-2 mb-3 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 group-data-[collapsible=icon]:hidden ${
                  location.pathname === createPageUrl("Users") ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700' : 'text-slate-700'
                }`}
              >
                <User className="w-4 h-4" />
                Users
              </Link>
            )}
            <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
              <div className="flex items-center gap-3">
                <ProfilePictureUpload user={user} onUpdated={(url) => setUser(prev => ({ ...prev, profile_picture_url: url }))} />
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="font-medium text-slate-900 text-sm truncate">{user?.full_name || 'User'}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="hover:bg-red-50 hover:text-red-600 transition-colors group-data-[collapsible=icon]:hidden"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-4 py-2 md:hidden shadow-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors flex-shrink-0" />
              <img
                src="https://media.base44.com/images/public/68dcdd68fd2e656bc4f622ca/d940d5b06_ThinkEngineCloud1.png"
                alt="ThinkEngine Cloud"
                className="h-12 w-auto object-contain"
              />
            </div>
          </header>

          <div className="flex-1 overflow-auto min-h-0">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}