
import React, { useState, useEffect, useCallback } from "react";
import { ActivityLog } from "@/entities/ActivityLog";
import { format } from "date-fns";
import { motion } from "framer-motion";

const activityIcons = {
  created: "🆕",
  updated: "✏️",
  assigned: "👤",
  commented: "💬",
  completed: "✅",
  moved: "➡️",
  attachment_added: "📎",
  checklist_added: "☑️",
  subtask_added: "📋",
};

export default function TaskActivity({ taskId }) {
  const [activities, setActivities] = useState([]);

  const loadActivities = useCallback(async () => {
    const activitiesData = await ActivityLog.filter({ task_id: taskId }, "-created_date");
    setActivities(activitiesData);
  }, [taskId]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  return (
    <div className="space-y-3">
      {activities.length === 0 ? (
        <p className="text-sm text-slate-500 italic">No activity yet</p>
      ) : (
        activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex gap-3 p-3 bg-white rounded-lg border border-slate-200"
          >
            <span className="text-xl">{activityIcons[activity.action_type] || "📌"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700">{activity.action_description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">
                  {format(new Date(activity.created_date), 'MMM d, p')}
                </span>
                {activity.user_email && (
                  <>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">{activity.user_email}</span>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}
