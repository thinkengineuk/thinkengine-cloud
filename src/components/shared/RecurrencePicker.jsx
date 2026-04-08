import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, getDaysInMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";

const DAYS_OF_WEEK_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function RecurrencePicker({ value, onChange }) {
  const [tab, setTab] = useState("week");
  const [selectedDays, setSelectedDays] = useState(["Monday"]);
  const [everyWeeks, setEveryWeeks] = useState(1);
  const [selectedDayOfMonth, setSelectedDayOfMonth] = useState(1);
  const [everyMonths, setEveryMonths] = useState(1);
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedYearDate, setSelectedYearDate] = useState(new Date());
  const [everyYears, setEveryYears] = useState(1);

  const getSummary = () => {
    if (tab === "week") {
      const days = selectedDays.length > 0 ? selectedDays.map(d => d.slice(0, 3)).join(", ") : "—";
      return `Every ${everyWeeks} week${everyWeeks > 1 ? "s" : ""} on ${days}`;
    }
    if (tab === "month") {
      if (selectedDayOfMonth === "last") return `Every ${everyMonths} month${everyMonths > 1 ? "s" : ""} on the last day`;
      return `Every ${everyMonths} month${everyMonths > 1 ? "s" : ""} on day ${selectedDayOfMonth}`;
    }
    return `Every ${everyYears} year${everyYears > 1 ? "s" : ""} on ${format(selectedYearDate, "MMM d")}`;
  };

  const getPattern = () => {
    if (tab === "week") return "weekly";
    if (tab === "month") {
      if (everyMonths >= 6) return "6_monthly";
      if (everyMonths >= 3) return "3_monthly";
      return "monthly";
    }
    return "yearly";
  };

  useEffect(() => {
    if (onChange) onChange(getPattern(), getSummary());
  }, [tab, selectedDays, everyWeeks, selectedDayOfMonth, everyMonths, selectedYearDate, everyYears]);

  const toggleDay = (day) => {
    setSelectedDays(prev =>
      prev.includes(day) ? (prev.length > 1 ? prev.filter(d => d !== day) : prev) : [...prev, day]
    );
  };

  const startDay = startOfWeek(new Date(calMonth.getFullYear(), calMonth.getMonth(), 1), { weekStartsOn: 1 });
  const endDay = endOfWeek(new Date(calMonth.getFullYear(), calMonth.getMonth(), getDaysInMonth(calMonth)), { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDay, end: endDay });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-4 w-72">
      <div className="flex bg-slate-100 rounded-full p-1 mb-4">
        {["week", "month", "year"].map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 text-sm font-medium py-1.5 rounded-full transition-all ${
              tab === t ? "bg-blue-500 text-white shadow" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "week" && (
        <div className="space-y-1">
          {DAYS_OF_WEEK_FULL.map(day => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedDays.includes(day) ? "bg-blue-500 text-white font-medium" : "hover:bg-slate-100 text-slate-700"
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      )}

      {tab === "month" && (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDayOfMonth(d)}
              className={`text-xs rounded-full w-7 h-7 flex items-center justify-center transition-colors ${
                selectedDayOfMonth === d ? "bg-blue-500 text-white font-semibold" : "hover:bg-slate-100 text-slate-700"
              }`}
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedDayOfMonth("last")}
            className={`col-span-3 text-xs rounded-lg px-2 py-1 transition-colors ${
              selectedDayOfMonth === "last" ? "bg-blue-500 text-white font-semibold" : "hover:bg-slate-100 text-slate-500"
            }`}
          >
            Last day
          </button>
        </div>
      )}

      {tab === "year" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setCalMonth(subMonths(calMonth, 1))} className="p-1 hover:bg-slate-100 rounded">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold">{MONTH_NAMES[calMonth.getMonth()]} {calMonth.getFullYear()}</span>
            <button type="button" onClick={() => setCalMonth(addMonths(calMonth, 1))} className="p-1 hover:bg-slate-100 rounded">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {["M","T","W","T","F","S","S"].map((d, i) => (
              <span key={i} className="text-xs text-slate-400 font-medium">{d}</span>
            ))}
            {calendarDays.map((date, i) => {
              const isSelected = isSameDay(date, selectedYearDate);
              const isCurrentMonth = date.getMonth() === calMonth.getMonth();
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => isCurrentMonth && setSelectedYearDate(date)}
                  className={`text-xs rounded-full w-7 h-7 flex items-center justify-center mx-auto transition-colors ${
                    isSelected ? "bg-blue-500 text-white font-semibold" :
                    isCurrentMonth ? "hover:bg-slate-100 text-slate-700" : "text-slate-300"
                  }`}
                >
                  {format(date, "d")}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
        <span className="text-sm text-slate-600">Every</span>
        <input
          type="number"
          min={1}
          max={99}
          value={tab === "week" ? everyWeeks : tab === "month" ? everyMonths : everyYears}
          onChange={e => {
            const v = Math.max(1, parseInt(e.target.value) || 1);
            if (tab === "week") setEveryWeeks(v);
            else if (tab === "month") setEveryMonths(v);
            else setEveryYears(v);
          }}
          className="w-12 text-center border border-slate-200 rounded-md text-sm py-1"
        />
        <span className="text-sm text-slate-600">
          {tab === "week" ? `week${everyWeeks > 1 ? "s" : ""}` : tab === "month" ? `month${everyMonths > 1 ? "s" : ""}` : `year${everyYears > 1 ? "s" : ""}`}
        </span>
      </div>

      <p className="text-xs text-slate-400 mt-2 italic">{getSummary()}</p>
    </div>
  );
}