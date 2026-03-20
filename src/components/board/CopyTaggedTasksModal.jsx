import React, { useState, useEffect } from "react";
import { Board } from "@/entities/Board";
import { Task } from "@/entities/Task";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, AlertCircle, Copy, Loader2 } from "lucide-react";
import { copyTaggedTasks } from "@/functions/copyTaggedTasks";

export default function CopyTaggedTasksModal({ boardId, allTags, open, onOpenChange }) {
  const [boards, setBoards] = useState([]);
  const [selectedTag, setSelectedTag] = useState("");
  const [targetBoardId, setTargetBoardId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (open) {
      setResult(null);
      setSelectedTag("");
      setTargetBoardId("");
      loadBoards();
    }
  }, [open]);

  const loadBoards = async () => {
    const allBoards = await Board.list("-created_date");
    setBoards(allBoards.filter(b => b.id !== boardId));
  };

  const handleCopy = async () => {
    if (!selectedTag || !targetBoardId) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await copyTaggedTasks({
        sourceBoardId: boardId,
        targetBoardId,
        tag: selectedTag,
      });
      setResult(response.data);
    } catch (err) {
      setResult({ success: false, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Copy className="w-5 h-5 text-blue-600" />
            Copy Tasks by Tag
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <p className="text-sm text-slate-500">
            Copy all tasks with a specific tag to another board, including comments, subtasks, checklists, and attachments.
          </p>

          <div className="space-y-2">
            <Label>Tag to copy</Label>
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tag..." />
              </SelectTrigger>
              <SelectContent>
                {allTags.map(tag => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Destination board</Label>
            <Select value={targetBoardId} onValueChange={setTargetBoardId}>
              <SelectTrigger>
                <SelectValue placeholder="Select target board..." />
              </SelectTrigger>
              <SelectContent>
                {boards.map(board => (
                  <SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {result && (
            <div className={`rounded-lg p-3 flex items-start gap-2 text-sm ${
              result.success
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {result.success
                ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
              }
              <div>
                <p className="font-medium">{result.message}</p>
                {result.errors && result.errors.length > 0 && (
                  <ul className="mt-1 list-disc list-inside space-y-0.5 text-xs opacity-80">
                    {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {result?.success ? 'Close' : 'Cancel'}
            </Button>
            {!result?.success && (
              <Button
                onClick={handleCopy}
                disabled={!selectedTag || !targetBoardId || loading}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Copying...
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Tasks
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}