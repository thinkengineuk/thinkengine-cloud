import React, { useState, useEffect } from "react";
import { Board } from "@/entities/Board";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { importAcbBoard } from "@/functions/importAcbBoard";

export default function ImportBoard() {
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState("");
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadBoards();
  }, []);

  const loadBoards = async () => {
    const allBoards = await Board.list("-created_date");
    setBoards(allBoards);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        alert('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file || !selectedBoard) {
      alert('Please select both a board and a CSV file');
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      const csvContent = await file.text();
      const response = await importAcbBoard({ csvContent, boardId: selectedBoard });
      
      if (response.data.success) {
        setResult({
          success: true,
          message: response.data.message,
          stats: response.data.stats,
        });
        setFile(null);
        const fileInput = document.getElementById('csv-file');
        if (fileInput) fileInput.value = '';
      } else {
        setResult({
          success: false,
          message: response.data.error || 'Import failed',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error.message || 'An error occurred during import',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Import Board from CSV
          </h1>
          <p className="text-white/90">Upload your ACB board data and import tasks, comments, and checklists</p>
        </div>

        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle>CSV File Upload</CardTitle>
            <CardDescription>
              Select a target board and upload your CSV file containing tasks and comments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>CSV Format Requirements:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Columns: id, token, name, notes, created_at, updated_at, status, due_date, status_updated_at, assignee, section, project, tags, checklists, comments</li>
                  <li>Assignees and comment authors will be matched by full name to existing users</li>
                  <li>Tasks will be created in columns matching the "section" field</li>
                  <li>Tags should be semicolon-separated (e.g., "HIGH; ThinkEngine")</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Target Board
                </label>
                <Select value={selectedBoard} onValueChange={setSelectedBoard}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a board to import into" />
                  </SelectTrigger>
                  <SelectContent>
                    {boards.map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Upload CSV File
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 cursor-pointer">
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:border-blue-500 transition-colors text-center">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">
                        {file ? file.name : 'Click to select CSV file'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Maximum file size: 10MB</p>
                    </div>
                    <input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <Button
                onClick={handleImport}
                disabled={!file || !selectedBoard || isUploading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                size="lg"
              >
                <Upload className="w-5 h-5 mr-2" />
                {isUploading ? 'Importing...' : 'Import Board Data'}
              </Button>
            </div>

            {result && (
              <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                {result.success ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
                <AlertDescription>
                  <p className={`font-semibold ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                    {result.message}
                  </p>
                  {result.stats && (
                    <div className="mt-2 text-sm text-green-800">
                      <p>Tasks created: {result.stats.tasksCreated}</p>
                      {result.stats.errors && result.stats.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="font-semibold">Warnings:</p>
                          <ul className="list-disc list-inside">
                            {result.stats.errors.slice(0, 5).map((err, idx) => (
                              <li key={idx}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}