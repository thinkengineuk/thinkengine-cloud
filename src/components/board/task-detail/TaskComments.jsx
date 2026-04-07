import React, { useState, useEffect, useCallback, useRef } from "react";
import { Comment } from "@/entities/Comment";
import { User } from "@/entities/User";
import { ActivityLog } from "@/entities/ActivityLog";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Send, Pencil, Trash2, X, Check } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { buildMentionEmail } from "@/utils/emailTemplates";

export default function TaskComments({ taskId, task, allUsers, currentUser: currentUserProp, onRefresh }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [currentUser, setCurrentUser] = useState(currentUserProp || null);
  const [users, setUsers] = useState(allUsers || []);
  const [submitting, setSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState("");
  
  // Mention autocomplete state
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const textareaRef = useRef(null);

  const loadComments = useCallback(async () => {
    const taskComments = await Comment.filter({ task_id: taskId }, "-created_date");
    setComments(taskComments);
  }, [taskId]);

  useEffect(() => {
    const init = async () => {
      if (!currentUserProp) {
        const me = await User.me();
        setCurrentUser(me);
      }
      if (!allUsers || allUsers.length === 0) {
        const fetchedUsers = await User.list();
        setUsers(fetchedUsers);
      }
    };
    init();
    loadComments();
  }, [loadComments]);

  useEffect(() => {
    if (currentUserProp) setCurrentUser(currentUserProp);
  }, [currentUserProp]);

  useEffect(() => {
    if (allUsers && allUsers.length > 0) setUsers(allUsers);
  }, [allUsers]);

  // Handle mention detection and filtering
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = newComment.substring(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      
      // Allow spaces in mention search to support full names
      // Stop if we detect a double-space or if a known user's full name is already complete
      const alreadyCompleted = users.some(u => 
        newComment.substring(lastAtSymbol + 1, lastAtSymbol + 1 + u.full_name.length + 1) === u.full_name + ' '
      );

      if (!alreadyCompleted && textAfterAt.length >= 0) {
        setMentionSearch(textAfterAt.toLowerCase());
        
        const filtered = users.filter(user => 
          user.full_name.toLowerCase().startsWith(textAfterAt.toLowerCase()) ||
          user.email.toLowerCase().startsWith(textAfterAt.toLowerCase())
        );
        
        setMentionSuggestions(filtered);
        setShowMentionSuggestions(filtered.length > 0 && textAfterAt.length > 0);
        setSelectedSuggestionIndex(0);
        return;
      }
    }
    
    setShowMentionSuggestions(false);
  }, [newComment, users]);

  const handleMentionSelect = (user) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = newComment.substring(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      const textBeforeAt = newComment.substring(0, lastAtSymbol);
      const textAfterCursor = newComment.substring(cursorPosition);
      
      const newText = `${textBeforeAt}@${user.full_name} ${textAfterCursor}`;
      setNewComment(newText);
      setShowMentionSuggestions(false);
      
      // Set cursor position after the mention
      setTimeout(() => {
        const newPosition = lastAtSymbol + user.full_name.length + 2;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
      }, 0);
    }
  };

  const handleKeyDown = (e) => {
    if (showMentionSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < mentionSuggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : mentionSuggestions.length - 1
        );
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (mentionSuggestions[selectedSuggestionIndex]) {
          handleMentionSelect(mentionSuggestions[selectedSuggestionIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowMentionSuggestions(false);
      }
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return;
    
    setSubmitting(true);
    try {
      // Extract mentions by checking if any known user's full name appears after @
      const mentions = [];
      for (const user of users) {
        const mention = `@${user.full_name}`;
        if (newComment.includes(mention) && !mentions.includes(user.email)) {
          mentions.push(user.email);
        }
      }

      // Save the comment first
      await Comment.create({ task_id: taskId, text: newComment.trim(), mentions });

      const taskData = task || {};
      const taskUrl = `${window.location.origin}/Board?id=${taskData.board_id}&taskId=${taskData.id || taskId}`;

      // Fetch recent comments for conversation history (last 5)
      const recentComments = await Comment.filter({ task_id: taskId }, 'created_date', 5);
      const conversationItems = recentComments.map(c => {
        const author = users.find(u => u.email === c.created_by);
        const date = new Date(c.created_date);
        const timestamp = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        return { authorName: author?.full_name || c.created_by || 'Unknown', timestamp, text: c.text };
      });
      // Add current comment
      conversationItems.push({
        authorName: currentUser.full_name,
        timestamp: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        text: newComment,
      });

      for (const email of mentions) {
        // Don't email yourself
        if (email === currentUser?.email) continue;
        const mentionedUser = users.find(u => u.email === email);
        const safeConversationItems = conversationItems.map(item => ({
          ...item,
          text: item.text.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
        }));

        const htmlBody = buildMentionEmail({
          recipientName: mentionedUser?.full_name,
          mentionerName: currentUser.full_name,
          taskTitle: taskData.title,
          taskUrl,
          conversationItems: safeConversationItems,
        });

        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `${currentUser.full_name} mentioned you on "${taskData.title}"`,
          body: htmlBody,
        });
      }

      setNewComment("");
      setShowMentionSuggestions(false);
      loadComments();
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.text);
  };

  const handleSaveEdit = async (commentId) => {
    if (!editText.trim()) return;
    
    try {
      await Comment.update(commentId, { text: editText });
      setEditingCommentId(null);
      setEditText("");
      loadComments();
    } catch (error) {
      console.error("Error updating comment:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditText("");
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    
    try {
      await Comment.delete(commentId);
      loadComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const getCommentAuthor = (comment) => {
    if (!comment.created_by) return null;
    return users.find(u => u.email === comment.created_by);
  };

  const formatTimestamp = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        return formatDistanceToNow(date, { addSuffix: true }).toUpperCase();
      } else if (diffInHours < 48) {
        return `YESTERDAY AT ${format(date, 'h:mm a').toUpperCase()}`;
      } else {
        return format(date, 'MMMM d, yyyy h:mm a').toUpperCase();
      }
    } catch (error) {
      return '';
    }
  };

  const formatCommentText = (text) => {
    const lines = text.split('\n');
    const formattedElements = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) {
        formattedElements.push(<div key={index} className="h-3" />);
        return;
      }
      
      const isDateHeader = trimmed.length <= 20 && 
                          !trimmed.startsWith('-') && 
                          !trimmed.startsWith('•') &&
                          !trimmed.startsWith('*') &&
                          /^[\d\s\w]+$/.test(trimmed);
      
      if (isDateHeader) {
        formattedElements.push(
          <div key={index} className="font-semibold text-slate-900 mt-4 mb-2 first:mt-0">
            {trimmed}
          </div>
        );
      } else if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
        const content = trimmed.replace(/^[-•*]\s*/, '');
        formattedElements.push(
          <div key={index} className="flex gap-2 mb-1.5 items-start">
            <span className="text-slate-600 mt-0.5 flex-shrink-0">•</span>
            <span className="flex-1 leading-relaxed">{content}</span>
          </div>
        );
      } else {
        formattedElements.push(
          <p key={index} className="mb-1.5 leading-relaxed">{trimmed}</p>
        );
      }
    });
    
    return formattedElements;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-slate-600" />
        <h3 className="font-semibold text-slate-900">Comments</h3>
        <span className="text-sm text-slate-500">({comments.length})</span>
      </div>

      {/* Add Comment */}
      <div className="space-y-2 relative">
        <Textarea
          ref={textareaRef}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment... Type @ to mention someone"
          className="min-h-[80px] resize-none"
        />
        
        {/* Mention Suggestions Dropdown */}
        {showMentionSuggestions && (
          <div className="absolute z-50 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto w-full">
            {mentionSuggestions.map((user, index) => (
              <div
                key={user.id}
                onClick={() => handleMentionSelect(user)}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                  index === selectedSuggestionIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
                }`}
              >
                <Avatar className="w-8 h-8">
                  {user.profile_picture_url ? (
                    <AvatarImage src={user.profile_picture_url} alt={user.full_name} />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-400 text-white text-sm">
                      {user.full_name[0]?.toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-900">{user.full_name}</div>
                  <div className="text-xs text-slate-500 truncate">{user.email}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500">
            Tip: Use @ to mention team members
          </span>
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || submitting}
            size="sm"
            className="bg-slate-900 hover:bg-slate-800"
          >
            <Send className="w-4 h-4 mr-2" />
            {submitting ? 'Posting...' : 'Comment'}
          </Button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No comments yet</p>
          </div>
        ) : (
          comments.map((comment) => {
            const author = getCommentAuthor(comment);
            const isOwnComment = comment.created_by === currentUser?.email;
            const isEditing = editingCommentId === comment.id;
            
            return (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="w-9 h-9 flex-shrink-0">
                  {author?.profile_picture_url ? (
                    <AvatarImage src={author.profile_picture_url} alt={author.full_name} />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-400 text-white text-sm">
                      {author?.full_name?.[0]?.toUpperCase() || comment.created_by?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-slate-900">
                        {author?.full_name || comment.created_by || 'Unknown User'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatTimestamp(comment.created_date)}
                        {comment.updated_date && comment.updated_date !== comment.created_date && (
                          <span className="ml-1">(edited)</span>
                        )}
                      </span>
                    </div>
                    
                    {isOwnComment && !isEditing && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEditComment(comment)}
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="min-h-[100px] resize-none text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(comment.id)}
                          className="bg-slate-900 hover:bg-slate-800"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 border border-slate-100">
                      {formatCommentText(comment.text)}
                    </div>
                  )}
                  
                  {comment.mentions && comment.mentions.length > 0 && !isEditing && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                      <span>Mentioned:</span>
                      {comment.mentions.map((email, idx) => {
                        const mentionedUser = users.find(u => u.email === email);
                        return (
                          <span key={idx} className="font-medium">
                            {mentionedUser?.full_name || email}
                            {idx < comment.mentions.length - 1 && ','}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}