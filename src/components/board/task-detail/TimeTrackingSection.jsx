import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Play, Square, Edit2, Check } from "lucide-react";
import { toggleTaskTimer } from "@/functions/toggleTaskTimer";

function formatMinutes(minutes) {
    if (!minutes || minutes === 0) return "0h 0m";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
}

export default function TimeTrackingSection({ task, currentUser, onRefresh, onUpdate }) {
    const [loading, setLoading] = useState(false);
    const [editingEstimate, setEditingEstimate] = useState(false);
    const [estimateHours, setEstimateHours] = useState("");
    const [estimateMinutes, setEstimateMinutes] = useState("");
    const [editingActual, setEditingActual] = useState(false);
    const [actualHoursInput, setActualHoursInput] = useState("");
    const [actualMinutesInput, setActualMinutesInput] = useState("");
    const [elapsed, setElapsed] = useState(0);
    const [localTimeEntries, setLocalTimeEntries] = useState(task.time_entries || []);

    // Sync local entries when parent task prop changes
    useEffect(() => {
        setLocalTimeEntries(task.time_entries || []);
    }, [task.time_entries]);

    const timeEntries = localTimeEntries;

    // Check if current user has an active timer on this task
    const activeEntry = timeEntries.find(
        (e) => e.user_id === currentUser?.email && !e.ended_at
    );
    const isRunning = !!activeEntry;

    // Live elapsed timer
    useEffect(() => {
        if (!isRunning || !activeEntry) {
            setElapsed(0);
            return;
        }
        const startedAt = new Date(activeEntry.started_at).getTime();
        const update = () => {
            const diff = Math.floor((Date.now() - startedAt) / 1000);
            setElapsed(diff);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [isRunning, activeEntry?.started_at]);

    const formatElapsed = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const handleToggle = async () => {
        setLoading(true);
        try {
            const res = await toggleTaskTimer({ taskId: task.id });
            // Immediately update local state so UI reflects change without waiting for parent refresh
            if (res?.data?.task?.time_entries) {
                setLocalTimeEntries(res.data.task.time_entries);
            }
            onRefresh();
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEstimate = async () => {
        const hrs = parseInt(estimateHours) || 0;
        const mins = parseInt(estimateMinutes) || 0;
        const total = hrs * 60 + mins;
        if (onUpdate) {
            await onUpdate({ estimated_minutes: total });
        } else {
            const { Task } = await import("@/entities/Task");
            await Task.update(task.id, { estimated_minutes: total });
            onRefresh();
        }
        setEditingEstimate(false);
    };

    const startEditEstimate = () => {
        const est = task.estimated_minutes || 0;
        setEstimateHours(String(Math.floor(est / 60)));
        setEstimateMinutes(String(est % 60));
        setEditingEstimate(true);
    };

    const startEditActual = () => {
        const act = task.actual_minutes || 0;
        setActualHoursInput(String(Math.floor(act / 60)));
        setActualMinutesInput(String(act % 60));
        setEditingActual(true);
    };

    const handleSaveActual = async () => {
        const hrs = parseInt(actualHoursInput) || 0;
        const mins = parseInt(actualMinutesInput) || 0;
        const total = hrs * 60 + mins;
        if (onUpdate) {
            await onUpdate({ actual_minutes: total });
        } else {
            const { Task } = await import("@/entities/Task");
            await Task.update(task.id, { actual_minutes: total });
            onRefresh();
        }
        setEditingActual(false);
    };

    const actualMinutes = task.actual_minutes || 0;
    const estimatedMinutes = task.estimated_minutes || 0;

    // Per-user breakdown
    const userTotals = {};
    timeEntries.forEach(e => {
        if (e.duration) {
            const key = e.user_name || e.user_id;
            userTotals[key] = (userTotals[key] || 0) + e.duration;
        }
    });

    return (
        <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Clock className="w-4 h-4" />
                Time Tracking
            </Label>

            {/* Start/Stop Button */}
            <Button
                onClick={handleToggle}
                disabled={loading}
                className={`w-full ${
                    isRunning
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-green-600 hover:bg-green-700 text-white"
                }`}
            >
                {isRunning ? (
                    <>
                        <Square className="w-4 h-4 mr-2 fill-white" />
                        Stop Timer — {formatElapsed(elapsed)}
                    </>
                ) : (
                    <>
                        <Play className="w-4 h-4 mr-2 fill-white" />
                        Start Timer
                    </>
                )}
            </Button>

            <p className="text-xs italic text-slate-500">
                Remember to note how long it took in the comments
            </p>

            {/* Est & Actual */}
            <div className="text-sm text-slate-600 space-y-1">
                <div className="flex items-center justify-between gap-2">
                    <span className="flex-1 min-w-0">
                        <span className="font-medium">Est:</span>{" "}
                        {estimatedMinutes > 0 ? formatMinutes(estimatedMinutes) : "Not set"}
                    </span>
                    <button
                        type="button"
                        onClick={startEditEstimate}
                        className="text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0"
                        title="Edit estimated time"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <span className="flex-1 min-w-0">
                        <span className="font-medium">Actual:</span>{" "}
                        <span className={actualMinutes > estimatedMinutes && estimatedMinutes > 0 ? "text-red-600 font-semibold" : ""}>
                            {formatMinutes(actualMinutes)}
                        </span>
                    </span>
                    <button
                        type="button"
                        onClick={startEditActual}
                        className="text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0"
                        title="Edit actual time"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Edit Actual */}
            {editingActual && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                    <div className="flex items-center gap-1 flex-1">
                        <Input
                            type="number"
                            min="0"
                            value={actualHoursInput}
                            onChange={(e) => setActualHoursInput(e.target.value)}
                            placeholder="0"
                            className="h-8 text-sm w-16"
                        />
                        <span className="text-xs text-slate-500">h</span>
                        <Input
                            type="number"
                            min="0"
                            max="59"
                            value={actualMinutesInput}
                            onChange={(e) => setActualMinutesInput(e.target.value)}
                            placeholder="0"
                            className="h-8 text-sm w-16"
                        />
                        <span className="text-xs text-slate-500">m</span>
                    </div>
                    <Button size="sm" className="h-8 px-2" onClick={handleSaveActual}>
                        <Check className="w-3.5 h-3.5" />
                    </Button>
                </div>
            )}

            {/* Edit Estimate */}
            {editingEstimate && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                    <div className="flex items-center gap-1 flex-1">
                        <Input
                            type="number"
                            min="0"
                            value={estimateHours}
                            onChange={(e) => setEstimateHours(e.target.value)}
                            placeholder="0"
                            className="h-8 text-sm w-16"
                        />
                        <span className="text-xs text-slate-500">h</span>
                        <Input
                            type="number"
                            min="0"
                            max="59"
                            value={estimateMinutes}
                            onChange={(e) => setEstimateMinutes(e.target.value)}
                            placeholder="0"
                            className="h-8 text-sm w-16"
                        />
                        <span className="text-xs text-slate-500">m</span>
                    </div>
                    <Button size="sm" className="h-8 px-2" onClick={handleSaveEstimate}>
                        <Check className="w-3.5 h-3.5" />
                    </Button>
                </div>
            )}

            {/* Per-user breakdown */}
            {Object.keys(userTotals).length > 0 && (
                <div className="text-xs text-slate-500 space-y-1 border-t border-slate-100 pt-2">
                    {Object.entries(userTotals).map(([name, mins]) => (
                        <div key={name} className="flex justify-between">
                            <span className="truncate">{name}</span>
                            <span className="font-medium text-slate-700 ml-2 flex-shrink-0">{formatMinutes(mins)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}