import React, { useState, useEffect, useCallback, useRef } from "react";
import { Comment } from "@/entities/Comment";
import { User } from "@/entities/User";
import { ActivityLog } from "@/entities/ActivityLog";
import { Attachment } from "@/entities/Attachment";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Send, Pencil, Trash2, X, Check, Paperclip, FileIcon, ExternalLink, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
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
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [commentAttachments, setCommentAttachments] = useState({});
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const loadingRef = useRef(false);
  const loadComments = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const [taskComments, allAttachments] = await Promise.all([
        Comment.filter({ task_id: taskId }, "-created_date"),
        Attachment.filter({ task_id: taskId }),
      ]);
      setComments(taskComments);
      const byComment = {};
      allAttachments.forEach(att => {
        if (att.comment_id) {
          if (!byComment[att.comment_id]) byComment[att.comment_id] = [];
          byComment[att.comment_id].push(att);
        }
      });
      setCommentAttachments(byComment);
    } finally {
      loadingRef.current = false;
    }
  }, [taskId]);

  useEffect(() => {
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
    if (!newComment.trim() || submitting || !currentUser) return;
    
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

      setUploading(true);
      // Save the comment first
      const createdComment = await Comment.create({ task_id: taskId, text: newComment.trim(), mentions });

      // Upload any attached files
      for (const file of selectedFiles) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await Attachment.create({
          task_id: taskId,
          comment_id: createdComment.id,
          file_url,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
        });
      }
      setSelectedFiles([]);
      setUploading(false);

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
        authorName: currentUser?.full_name || 'Unknown',
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
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Error adding comment:", error);
      setUploading(false);
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
      const normalized = dateString.endsWith('Z') || dateString.includes('+') ? dateString : dateString + 'Z';
      const date = new Date(normalized);
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

  const linkifyText = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (/^https?:\/\//.test(part) || /^www\./.test(part)) {
        const href = part.startsWith('www.') ? `https://${part}` : part;
        return (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800 break-all inline-flex items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}>
            {part}<ExternalLink className="w-3 h-3 inline flex-shrink-0" />
          </a>
        );
      }
      return part;
    });
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
            {linkifyText(trimmed)}
          </div>
        );
      } else if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
        const content = trimmed.replace(/^[-•*]\s*/, '');
        formattedElements.push(
          <div key={index} className="flex gap-2 mb-1.5 items-start">
            <span className="text-slate-600 mt-0.5 flex-shrink-0">•</span>
            <span className="flex-1 leading-relaxed">{linkifyText(content)}</span>
          </div>
        );
      } else {
        formattedElements.push(
          <p key={index} className="mb-1.5 leading-relaxed">{linkifyText(trimmed)}</p>
        );
      }
    });
    
    return formattedElements;
  };

  const handleCommentDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.index === destination.index) return;

    const reordered = Array.from(comments);
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);

    setComments(reordered);
    await Promise.all(reordered.map((c, idx) => Comment.update(c.id, { position: idx })));
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
        
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-1 bg-slate-100 rounded-md px-2 py-1 text-xs text-slate-700">
                <FileIcon className="w-3 h-3" />
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button onClick={() => setSelectedFiles(prev => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500 ml-1">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => setSelectedFiles(prev => [...prev, ...Array.from(e.target.files)])}
            />
            <Button variant="ghost" size="sm" className="h-8 text-xs px-2 text-slate-500" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="w-3.5 h-3.5 mr-1" />
              Attach
            </Button>
            <span className="text-xs text-slate-500 hidden sm:inline">Type @ to mention</span>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={(!newComment.trim() && selectedFiles.length === 0) || submitting || uploading}
            size="sm"
            className="bg-slate-900 hover:bg-slate-800"
          >
            <Send className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : submitting ? 'Posting...' : 'Comment'}
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
          <DragDropContext onDragEnd={currentUser?.role === 'admin' ? handleCommentDragEnd : undefined}>
            <Droppable droppableId="comments" isDragDisabled={currentUser?.role !== 'admin'}>
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
                  {comments.map((comment, index) => {
                    const author = getCommentAuthor(comment);
                    const isOwnComment = comment.created_by === currentUser?.email;
                    const isEditing = editingCommentId === comment.id;
                    
                    return (
                      <Draggable key={comment.id} draggableId={comment.id} index={index} isDragDisabled={currentUser?.role !== 'admin'}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            className={`flex gap-3 ${dragSnapshot.isDragging ? 'bg-slate-50 rounded-lg p-2' : ''}`}
                          >
                            {currentUser?.role === 'admin' && (
                              <div {...dragProvided.dragHandleProps} className="cursor-grab text-slate-300 hover:text-slate-500 flex items-start mt-2">
                                <GripVertical className="w-4 h-4" />
                              </div>
                            )}
                            
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
                              
                              {commentAttachments[comment.id]?.length > 0 && !isEditing && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {commentAttachments[comment.id].map((att) => (
                                    <a
                                      key={att.id}
                                      href={att.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 rounded-md px-2 py-1 text-xs text-slate-700 transition-colors"
                                    >
                                      <Paperclip className="w-3 h-3 flex-shrink-0" />
                                      <span className="max-w-[160px] truncate">{att.file_name}</span>
                                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                    </a>
                                  ))}
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
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}