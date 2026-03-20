// frontend-dashboard/components/chat/TemplateSelectModal.tsx

import React, { useEffect, useState } from 'react';
import apiClient from '../../services/apiClient';
import { X, Send } from 'lucide-react';

export default function TemplateSelectModal({ isOpen, onClose, conversationId, onSent }: any) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetches templates from your existing templateRoutes
      apiClient.get('/templates').then(res => setTemplates(res.data)).catch(console.error);
    }
  }, [isOpen]);

  const handleSendTemplate = async (templateName: string) => {
    setLoading(true);
    try {
      await apiClient.post(`/conversations/${conversationId}/reply`, {
        type: "template",
        templateName
      });
      onSent();
      onClose();
    } catch (err) {
      alert("Failed to send template.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to safely extract the preview text from the new JSONB content structure
  const getTemplatePreview = (t: any) => {
    if (t.content) {
      const contentObj = typeof t.content === 'string' ? JSON.parse(t.content) : t.content;
      return contentObj.body || t.body_text || "No preview available";
    }
    return t.body_text || "No preview available";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">Select Re-engagement Template</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>
        <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto bg-slate-100">
          {templates.length === 0 ? (
             <p className="text-sm text-center text-slate-500 py-4">No approved templates found.</p>
          ) : (
            templates.filter(t => t.status === 'approved').map(t => (
              <button 
                key={t.id}
                disabled={loading}
                onClick={() => handleSendTemplate(t.name)}
                className="w-full text-left p-4 border border-slate-200 bg-white rounded-xl hover:border-emerald-400 hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="font-black text-xs uppercase tracking-wider text-emerald-600">{t.name}</p>
                  <Send size={14} className="text-slate-300 group-hover:text-emerald-500" />
                </div>
                <p className="text-sm text-slate-600 leading-snug">
                  {getTemplatePreview(t)}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
