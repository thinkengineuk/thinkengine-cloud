import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Board } from "@/entities/Board";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CheckCircle2, AlertCircle, Info, Eye, ArrowRight, FileJson } from "lucide-react";
import { importMeistertask } from "@/functions/importMeistertask";

export default function ImportMeistertask() {
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState("");
  const [file, setFile] = useState(null);
  const [jsonData, setJsonData] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [step, setStep] = useState(1); // 1=upload, 2=preview, 3=done

  useEffect(() => {
    Board.list("-created_date").then(setBoards);
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.json')) {
      alert('Please select a JSON file');
      return;
    }

    setFile(selectedFile);
    setPreview(null);
    setResult(null);
    setStep(1);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        setJsonData(parsed);
      } catch {
        alert('Invalid JSON file. Please check the file and try again.');
        setFile(null);
        setJsonData(null);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handlePreview = async () => {
    if (!jsonData) return;
    setIsLoading(true);
    try {
      const response = await importMeistertask({ jsonData, previewOnly: true });
      if (response.data.success) {
        setPreview(response.data.preview);
        setStep(2);
      } else {
        alert(response.data.error || 'Failed to parse JSON');
      }
    } catch (err) {
      alert(err.message || 'Failed to parse JSON');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!jsonData || !selectedBoard) return;
    setIsLoading(true);
    setResult(null);

    try {
      const response = await importMeistertask({ jsonData, targetBoardId: selectedBoard, previewOnly: false });
      if (response.data.success) {
        setResult({ success: true, message: response.data.message, stats: response.data.stats });
        setStep(3);
      } else {
        setResult({ success: false, message: response.data.error || 'Import failed' });
      }
    } catch (err) {
      setResult({ success: false, message: err.message || 'An error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Import from Meistertask
          </h1>
          <p className="text-white/90">Upload your Meistertask JSON export and migrate tasks into this app</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2">
          {[
            { n: 1, label: "Upload" },
            { n: 2, label: "Preview" },
            { n: 3, label: "Done" },
          ].map(({ n, label }, i) => (
            <React.Fragment key={n}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${step >= n ? 'bg-white text-blue-600' : 'bg-white/20 text-white'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step > n ? 'bg-green-500 text-white' : step === n ? 'bg-blue-600 text-white' : 'bg-white/30 text-white'}`}>
                  {step > n ? '✓' : n}
                </span>
                {label}
              </div>
              {i < 2 && <ArrowRight className="w-4 h-4 text-white/50" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>Upload JSON Export</CardTitle>
              <CardDescription>Export your project from Meistertask as JSON, then upload it here</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>How to export from Meistertask:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                    <li>Open your project in Meistertask</li>
                    <li>Go to Project Settings → Export</li>
                    <li>Choose <strong>JSON format</strong> and download</li>
                    <li>Upload the downloaded .json file below</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <label className="cursor-pointer block">
                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${file ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}>
                  <FileJson className={`w-10 h-10 mx-auto mb-3 ${file ? 'text-blue-500' : 'text-slate-400'}`} />
                  <p className="font-medium text-slate-700">
                    {file ? file.name : 'Click to select your Meistertask JSON file'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">JSON files only</p>
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <Button
                onClick={handlePreview}
                disabled={!jsonData || isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 h-11"
              >
                <Eye className="w-4 h-4 mr-2" />
                {isLoading ? 'Parsing...' : 'Preview Import'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Preview + Board selection */}
        {step === 2 && preview && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>Preview & Confirm</CardTitle>
              <CardDescription>Review what will be imported, then choose a target board</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Summary */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <p className="font-semibold text-slate-800 text-lg">{preview.projectName}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <p className="text-2xl font-bold text-blue-600">{preview.sections.length}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Columns</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <p className="text-2xl font-bold text-purple-600">{preview.totalTasks}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Tasks</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {preview.sections.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 shadow-sm">
                      <span className="text-sm font-medium text-slate-700">{s.name}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{s.taskCount} tasks</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target board */}
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

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!selectedBoard || isLoading}
                  className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white h-11"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isLoading ? 'Importing...' : `Import ${preview.totalTasks} Tasks`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Result */}
        {step === 3 && result && (
          <Card className="border-none shadow-xl">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              {result.success ? (
                <>
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                  <h2 className="text-xl font-bold text-slate-800">Import Complete!</h2>
                  <p className="text-slate-600">{result.message}</p>
                  {result.stats?.errors?.length > 0 && (
                    <Alert className="text-left border-yellow-200 bg-yellow-50 mt-4">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription>
                        <p className="font-semibold text-yellow-800 mb-1">{result.stats.errors.length} warnings:</p>
                        <ul className="text-sm text-yellow-700 space-y-0.5 list-disc list-inside">
                          {result.stats.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button
                    onClick={() => { setStep(1); setFile(null); setJsonData(null); setPreview(null); setResult(null); setSelectedBoard(""); }}
                    variant="outline"
                    className="mt-2"
                  >
                    Import Another Project
                  </Button>
                </>
              ) : (
                <>
                  <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
                  <h2 className="text-xl font-bold text-slate-800">Import Failed</h2>
                  <p className="text-slate-600">{result.message}</p>
                  <Button onClick={() => setStep(2)} variant="outline">Try Again</Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}