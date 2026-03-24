import React, { useState, useEffect } from "react";
import { Task } from "@/entities/Task";
import { Board } from "@/entities/Board";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Clock, Users, TrendingUp, Target } from "lucide-react";

function formatMinutes(minutes) {
    if (!minutes || minutes === 0) return "0h 0m";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
}

export default function Productivity() {
    const [tasks, setTasks] = useState([]);
    const [boards, setBoards] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [filterBoardId, setFilterBoardId] = useState("all");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const [user, allBoards] = await Promise.all([
                base44.auth.me(),
                Board.list(),
            ]);
            setCurrentUser(user);
            const myBoards = allBoards.filter(b => b.members?.includes(user.email));
            setBoards(myBoards);

            const allTasks = await Task.list();
            const myBoardIds = new Set(myBoards.map(b => b.id));
            setTasks(allTasks.filter(t => myBoardIds.has(t.board_id)));
            setLoading(false);
        };
        load();
    }, []);

    const filteredTasks = filterBoardId === "all"
        ? tasks
        : tasks.filter(t => t.board_id === filterBoardId);

    // All time entries from filtered tasks
    const allEntries = filteredTasks.flatMap(t => (t.time_entries || []).filter(e => e.duration));

    // Total hours
    const totalMinutes = allEntries.reduce((sum, e) => sum + (e.duration || 0), 0);

    // Per-user totals
    const perUser = {};
    allEntries.forEach(e => {
        const key = e.user_name || e.user_id;
        perUser[key] = (perUser[key] || 0) + (e.duration || 0);
    });
    const perUserData = Object.entries(perUser)
        .map(([name, minutes]) => ({ name, minutes, hours: +(minutes / 60).toFixed(1) }))
        .sort((a, b) => b.minutes - a.minutes);

    // Per-board totals
    const boardsMap = Object.fromEntries(boards.map(b => [b.id, b]));
    const perBoard = {};
    filteredTasks.forEach(t => {
        const boardName = boardsMap[t.board_id]?.name || t.board_id;
        const taskMinutes = (t.time_entries || []).reduce((sum, e) => sum + (e.duration || 0), 0);
        perBoard[boardName] = (perBoard[boardName] || 0) + taskMinutes;
    });
    const perBoardData = Object.entries(perBoard)
        .map(([name, minutes]) => ({ name, minutes, hours: +(minutes / 60).toFixed(1) }))
        .sort((a, b) => b.minutes - a.minutes);

    // Est vs Actual per board
    const estActualMap = {};
    filteredTasks.forEach(t => {
        const boardName = boardsMap[t.board_id]?.name || t.board_id;
        if (!estActualMap[boardName]) estActualMap[boardName] = { estimated: 0, actual: 0 };
        if (t.estimated_minutes) estActualMap[boardName].estimated += t.estimated_minutes;
        if (t.actual_minutes) estActualMap[boardName].actual += t.actual_minutes;
    });
    const estActualData = Object.entries(estActualMap)
        .map(([name, { estimated, actual }]) => ({
            name,
            estimated: +(estimated / 60).toFixed(1),
            actual: +(actual / 60).toFixed(1),
        }))
        .filter(d => d.estimated > 0 || d.actual > 0);

    // Tasks with most time
    const topTasks = [...filteredTasks]
        .filter(t => t.actual_minutes > 0)
        .sort((a, b) => (b.actual_minutes || 0) - (a.actual_minutes || 0))
        .slice(0, 8);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-screen">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Productivity</h1>
                        <p className="text-slate-500 mt-1">Time tracking insights across your projects</p>
                    </div>
                    <Select value={filterBoardId} onValueChange={setFilterBoardId}>
                        <SelectTrigger className="w-52 bg-white">
                            <SelectValue placeholder="All boards" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Boards</SelectItem>
                            {boards.map(b => (
                                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-none shadow-md">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                                <Clock className="w-6 h-6 text-teal-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Total Time</p>
                                <p className="text-2xl font-bold text-slate-900">{formatMinutes(totalMinutes)}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Users className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Contributors</p>
                                <p className="text-2xl font-bold text-slate-900">{Object.keys(perUser).length}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Tasks Tracked</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {filteredTasks.filter(t => t.actual_minutes > 0).length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                <Target className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Avg / Task</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {filteredTasks.filter(t => t.actual_minutes > 0).length > 0
                                        ? formatMinutes(Math.round(totalMinutes / filteredTasks.filter(t => t.actual_minutes > 0).length))
                                        : "—"}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Time per User */}
                    <Card className="border-none shadow-md">
                        <CardHeader>
                            <CardTitle className="text-base">Time per Team Member</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {perUserData.length === 0 ? (
                                <p className="text-slate-500 text-sm text-center py-8">No time tracked yet</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={perUserData} layout="vertical" margin={{ left: 10, right: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" unit="h" tick={{ fontSize: 11 }} />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                                        <Tooltip formatter={(val) => [`${val}h`, "Hours"]} />
                                        <Bar dataKey="hours" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    {/* Time per Board */}
                    {filterBoardId === "all" && (
                        <Card className="border-none shadow-md">
                            <CardHeader>
                                <CardTitle className="text-base">Time per Board</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {perBoardData.length === 0 ? (
                                    <p className="text-slate-500 text-sm text-center py-8">No time tracked yet</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={perBoardData} layout="vertical" margin={{ left: 10, right: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" unit="h" tick={{ fontSize: 11 }} />
                                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                                            <Tooltip formatter={(val) => [`${val}h`, "Hours"]} />
                                            <Bar dataKey="hours" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Est vs Actual */}
                    {estActualData.length > 0 && (
                        <Card className="border-none shadow-md">
                            <CardHeader>
                                <CardTitle className="text-base">Estimated vs Actual (hours)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={estActualData} margin={{ left: 10, right: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                        <YAxis unit="h" tick={{ fontSize: 11 }} />
                                        <Tooltip formatter={(val) => [`${val}h`]} />
                                        <Legend />
                                        <Bar dataKey="estimated" fill="#94a3b8" name="Estimated" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="actual" fill="#14b8a6" name="Actual" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* Top Tasks by Time */}
                    <Card className="border-none shadow-md">
                        <CardHeader>
                            <CardTitle className="text-base">Most Time-Intensive Tasks</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {topTasks.length === 0 ? (
                                <p className="text-slate-500 text-sm text-center py-8">No time tracked yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {topTasks.map(t => {
                                        const board = boardsMap[t.board_id];
                                        const pct = t.estimated_minutes
                                            ? Math.round((t.actual_minutes / t.estimated_minutes) * 100)
                                            : null;
                                        return (
                                            <div key={t.id} className="flex items-center gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-800 truncate">{t.title}</p>
                                                    {board && <p className="text-xs text-slate-400">{board.name}</p>}
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {pct !== null && (
                                                        <Badge className={`text-xs ${pct > 100 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                            {pct}%
                                                        </Badge>
                                                    )}
                                                    <span className="text-sm font-semibold text-slate-700">
                                                        {formatMinutes(t.actual_minutes)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}