import { useState } from "react";
import apiClient from "../../services/apiClient";
import { X, Upload, FileSpreadsheet, CheckCircle, AlertTriangle } from "lucide-react";

export default function BulkUploadModal({ isOpen, onClose, botId }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bot_id", botId);

    try {
      await apiClient.post("/api/templates/upload-leads", formData);
      alert("Leads imported successfully!");
      onClose();
    } catch (err) {
      alert("Failed to upload CSV. Ensure columns match: phone, name, email");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-black text-slate-900 uppercase text-sm tracking-tight flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-emerald-500" /> Bulk Import
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-all"><X size={18} /></button>
        </div>

        <div className="p-8">
          <div 
            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all ${file ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}
          >
            <Upload size={32} className={file ? 'text-emerald-500' : 'text-slate-300'} />
            <input 
              type="file" 
              accept=".csv" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="mt-4 text-xs font-bold text-slate-600">
              {file ? file.name : "Click or drag CSV file here"}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">Required: phone, name, email</p>
          </div>

          <button 
            disabled={!file || isUploading}
            onClick={handleUpload}
            className="w-full mt-6 bg-slate-900 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 shadow-lg active:scale-95"
          >
            {isUploading ? "Processing..." : "Start Import"}
          </button>
        </div>
      </div>
    </div>
  );
}