import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const EMOJI_CATEGORIES = [
  {
    label: "Smileys",
    emojis: ["😀","😂","😍","🥰","😎","🤔","😅","😭","😡","🥳","😴","🤯","🤩","😬","😏","🙄","😱","🤗","😇","🥺","😤","😔","😒","🤭","😜","😝","🤪","😛","🤑","😈"]
  },
  {
    label: "Gestures",
    emojis: ["👍","👎","👏","🙌","🤝","🤜","🤛","✊","👊","🤞","✌️","🤟","🤙","👋","🖐️","👌","🤌","💪","🖖","☝️","👆","👇","👈","👉","🤏","🙏","💅","✍️","🤲","🫶"]
  },
  {
    label: "Hearts",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","❤️‍🔥","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","🫀","♥️","🫶","❤️‍🩹"]
  },
  {
    label: "Objects",
    emojis: ["🎉","🎊","🎈","🎁","🏆","🥇","⭐","🌟","💫","✨","🔥","💥","💡","🎯","🚀","🛸","⚡","🌈","💎","🔮","🎸","🎵","🎶","🍕","🍺","☕","🎮","📱","💻","🔑"]
  },
  {
    label: "Animals",
    emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🦆","🦅","🦉","🦇","🐝","🦋","🐌","🐛","🦄","🐉","🦖","🦕","🐙","🦑","🦈"]
  },
  {
    label: "Symbols",
    emojis: ["✅","❌","⭕","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","🔶","🔷","🔸","🔹","🔺","🔻","💠","🔘","🔲","🔳","▪️","▫️","◾","◽","◼️","◻️","🟥","🟧","🟨"]
  }
];

export default function CommentReactions({ commentId, reactions, currentUserEmail, onReactionToggle }) {
  const [showPicker, setShowPicker] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const pickerRef = useRef(null);

  // Group reactions by emoji
  const grouped = {};
  (reactions || []).forEach(r => {
    if (!grouped[r.emoji]) grouped[r.emoji] = [];
    grouped[r.emoji].push(r.user_email);
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    if (showPicker) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPicker]);

  const handleEmojiClick = (emoji) => {
    onReactionToggle(commentId, emoji);
    setShowPicker(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1 mt-2 relative">
      {/* Existing reaction bubbles */}
      {Object.entries(grouped).map(([emoji, emails]) => {
        const hasReacted = emails.includes(currentUserEmail);
        return (
          <button
            key={emoji}
            onClick={() => onReactionToggle(commentId, emoji)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all
              ${hasReacted
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            title={emails.join(", ")}
          >
            <span>{emoji}</span>
            <span className="font-medium">{emails.length}</span>
          </button>
        );
      })}

      {/* Add reaction button */}
      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setShowPicker(p => !p)}
          className="flex items-center justify-center w-7 h-7 rounded-full border border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all text-sm"
          title="Add reaction"
        >
          😊
        </button>

        {showPicker && (
          <div className="absolute bottom-full left-0 mb-2 z-50 bg-white border border-slate-200 rounded-xl shadow-xl w-72">
            {/* Category tabs */}
            <div className="flex border-b border-slate-100 px-2 pt-2 gap-0.5 overflow-x-auto">
              {EMOJI_CATEGORIES.map((cat, i) => (
                <button
                  key={cat.label}
                  onClick={() => setActiveCategory(i)}
                  className={`px-2 py-1 text-xs rounded-t font-medium whitespace-nowrap transition-colors ${
                    activeCategory === i
                      ? "bg-blue-50 text-blue-700 border-b-2 border-blue-500"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Emoji grid */}
            <div className="p-2 grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto">
              {EMOJI_CATEGORIES[activeCategory].emojis.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="w-8 h-8 flex items-center justify-center text-lg rounded hover:bg-slate-100 transition-colors"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}