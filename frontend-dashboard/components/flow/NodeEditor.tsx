// frontend-dashboard/components/flow/NodeEditor.tsx

import { Node } from "reactflow";
import { useEffect, useRef, useState } from "react";
import apiClient from "../../services/apiClient";
import { RotateCcw, Link, Headset, Bot, LayoutTemplate } from "lucide-react";

interface NodeEditorProps {
  node: Node | null;
  onUpdate: (data: any) => void;
  onSaveAndClose?: (data: any) => void | Promise<void>;
  onClose: () => void;
  currentBotId?: string;
  currentFlowId?: string | null;
  flowOptions?: Array<{ id: string; flow_name?: string; name?: string; is_default?: boolean }>;
  botOptions?: Array<{ id: string; name?: string }>;
  flowOptionsByBot?: Record<
    string,
    Array<{ id: string; flow_name?: string; name?: string; is_default?: boolean }>
  >;
  leadForms?: Array<{
    id: string;
    name?: string;
    fields?: Array<{
      id?: string;
      fieldKey: string;
      fieldType?: string;
      questionLabel: string;
      isRequired?: boolean;
      sortOrder?: number;
    }>;
  }>;
}

export default function NodeEditor({
  node,
  onUpdate,
  onSaveAndClose,
  onClose,
  currentBotId,
  currentFlowId,
  flowOptions = [],
  botOptions = [],
  flowOptionsByBot = {},
  leadForms = [],
}: NodeEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [draftData, setDraftData] = useState<any>(node?.data || {});
  const draftDataRef = useRef<any>(node?.data || {});

  const handleSaveAndCloseClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const latestDraft = draftDataRef.current;

    if (onSaveAndClose) {
      void onSaveAndClose(latestDraft);
      return;
    }

    onUpdate(latestDraft);
    onClose();
  };

  useEffect(() => {
    setDraftData(node?.data || {});
    draftDataRef.current = node?.data || {};
  }, [node?.id, node?.data]);

  if (!node) return null;

  const updateData = (key: string, value: any) => {
    setDraftData((prev: any) => {
      const next = { ...prev, [key]: value };
      draftDataRef.current = next;
      return next;
    });
  };

  const inferValidationForLeadField = (fieldType?: string, fieldKey?: string) => {
    const normalizedType = String(fieldType || "").trim().toLowerCase();
    const normalizedKey = String(fieldKey || "").trim().toLowerCase();

    if (normalizedType === "email" || normalizedKey === "email") return "email";
    if (normalizedType === "phone" || normalizedKey === "phone") return "phone";
    if (normalizedType === "number") return "number";
    if (normalizedType === "date") return "date";
    return "text";
  };

  const gotoType = String(draftData.gotoType || "node").trim().toLowerCase();
  const selectedLeadFormId = String(draftData.linkedFormId || "").trim();
  const selectedLeadForm =
    leadForms.find((form) => String(form.id) === selectedLeadFormId) || null;
  const selectedLeadFormFields = Array.isArray(selectedLeadForm?.fields)
    ? [...selectedLeadForm.fields].sort(
        (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
      )
    : [];
  const sameBotFlowOptions = flowOptions.filter(
    (flow) => String(flow.id) !== String(currentFlowId || "")
  );
  const selectedTargetBotId = String(draftData.targetBotId || "").trim();
  const targetBotFlowOptions = selectedTargetBotId
    ? flowOptionsByBot[selectedTargetBotId] || []
    : [];

  const applyLeadFormFieldSelection = (formId: string, fieldKey: string) => {
    const form = leadForms.find((item) => String(item.id) === String(formId)) || null;
    const field =
      Array.isArray(form?.fields)
        ? form.fields.find((item) => String(item.fieldKey) === String(fieldKey)) || null
        : null;

    setDraftData((prev: any) => {
      const next = {
      ...prev,
      linkLeadForm: true,
      linkedFormId: formId,
      linkedFieldKey: field?.fieldKey || "",
      variable: field?.fieldKey || "",
      validation: inferValidationForLeadField(field?.fieldType, field?.fieldKey),
      text:
        String(prev.text || "").trim().length > 0
          ? prev.text
          : field?.questionLabel || prev.text || "",
      };
      draftDataRef.current = next;
      return next;
    });
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let fileToUpload = file;

      if (file.type.startsWith('image/')) {
        fileToUpload = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 1024;
              let width = img.width;
              let height = img.height;

              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              
              canvas.toBlob((blob) => {
                if (blob) resolve(new File([blob], file.name, { type: file.type }));
                else resolve(file); 
              }, file.type, 0.7); 
            };
          };
        });
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);

      const response = await apiClient.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (response.data?.url) updateData('media_url', response.data.url);
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  /* =====================================================================
     SHARED LOGIC (For Inputs and Menus)
  ===================================================================== */
  
  const RenderTimeoutAndRetryLogic = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">On Invalid Message</label>
        <textarea className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs resize-none h-12" placeholder="Invalid format/selection. Please try again." value={draftData.onInvalidMessage || ""} onChange={(e) => updateData('onInvalidMessage', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Max Retries</label>
          <input type="number" className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs" placeholder="3" value={draftData.maxRetries || ""} onChange={(e) => updateData('maxRetries', Number(e.target.value))} />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Global Error Node ID</label>
          <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder="error1" value={draftData.errorNode || ""} onChange={(e) => updateData('errorNode', e.target.value)} />
        </div>
      </div>

      <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 space-y-3">
        <div className="flex items-center gap-1 mb-1">
          <RotateCcw size={12} className="text-amber-600" />
          <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Inactivity & Timeout</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[8px] font-black text-amber-600 uppercase mb-1">Reminder Delay (Sec)</label>
            <input type="number" className="w-full border-none bg-white rounded p-2 text-xs" placeholder="300" value={draftData.reminderDelay || ""} onChange={(e) => updateData('reminderDelay', Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-[8px] font-black text-amber-600 uppercase mb-1">Timeout (Sec)</label>
            <input type="number" className="w-full border-none bg-white rounded p-2 text-xs" placeholder="900" value={draftData.timeout || ""} onChange={(e) => updateData('timeout', Number(e.target.value))} />
          </div>
        </div>
        <textarea className="w-full border-none bg-white rounded p-2 text-xs resize-none h-12" placeholder="Reminder text..." value={draftData.reminderText || ""} onChange={(e) => updateData('reminderText', e.target.value)} />
        <textarea className="w-full border-none bg-white rounded p-2 text-xs resize-none h-12" placeholder="Fallback text if Timeout Node is missing..." value={draftData.timeoutFallback || ""} onChange={(e) => updateData('timeoutFallback', e.target.value)} />
      </div>
    </div>
  );

  /* =====================================================================
     NODE-SPECIFIC RENDER COMPONENTS
  ===================================================================== */

  const RenderMenuOptionsNode = (maxOptions: number, label: string, isList = false) => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      {isList ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Button Text</label>
            <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-medium" placeholder="View Options" value={draftData.buttonText || ""} onChange={(e) => updateData("buttonText", e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Section Title</label>
            <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-medium" placeholder="Options" value={draftData.sectionTitle || ""} onChange={(e) => updateData("sectionTitle", e.target.value)} />
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}s (Max {maxOptions})</label>
        {Array.from({ length: maxOptions }).map((_, i) => {
          const num = i + 1;
          return (
            <input 
              key={num}
              className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg p-2.5 text-xs font-medium focus:border-blue-500 outline-none transition-all" 
              placeholder={`${label} ${num}`}
              value={draftData[`item${num}`] || ""}
              onChange={(e) => updateData(`item${num}`, e.target.value)}
            />
          );
        })}
      </div>
      {RenderTimeoutAndRetryLogic()}
    </div>
  );

  const RenderInputNode = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
        <label className="block text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1">Variable Name</label>
        <input className="w-full border border-white bg-white rounded p-2 text-xs font-mono" placeholder="e.g. user_email" value={draftData.variable || ""} onChange={(e) => updateData('variable', e.target.value)} />
      </div>

      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Validation Type</label>
        <select className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-medium outline-none" value={draftData.validation || "text"} onChange={(e) => updateData('validation', e.target.value)}>
          <option value="text">Text / Any</option>
          <option value="email">Email</option>
          <option value="phone">Phone Number</option>
          <option value="number">Numeric</option>
          <option value="date">Date</option>
          <option value="regex">Custom Regex</option>
        </select>
      </div>

      <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
        <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-800">
          <input
            type="checkbox"
            checked={Boolean(draftData.linkLeadForm)}
            onChange={(e) => {
              const enabled = e.target.checked;
              if (!enabled) {
                setDraftData((prev: any) => {
                  const next = {
                    ...prev,
                    linkLeadForm: false,
                    linkedFormId: "",
                    linkedFieldKey: "",
                  };
                  draftDataRef.current = next;
                  return next;
                });
                return;
              }

              setDraftData((prev: any) => {
                const next = {
                  ...prev,
                  linkLeadForm: true,
                };
                draftDataRef.current = next;
                return next;
              });
            }}
          />
          Link To Lead Form
        </label>

        {draftData.linkLeadForm ? (
          <div className="text-[11px] leading-5 text-emerald-800">
            Choose which form this answer belongs to, then choose which question/field in that form should receive the user's response.
          </div>
        ) : null}

        {draftData.linkLeadForm ? (
          <>
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-emerald-700">
                Which Form?
              </label>
              <select
                className="w-full border border-emerald-200 bg-white rounded-lg p-2.5 text-xs font-medium outline-none"
                value={draftData.linkedFormId || ""}
                onChange={(e) => {
                  const nextFormId = e.target.value;
                  const nextForm =
                    leadForms.find((form) => String(form.id) === String(nextFormId)) || null;
                  const firstField = Array.isArray(nextForm?.fields) ? nextForm.fields[0] : null;
                  applyLeadFormFieldSelection(nextFormId, String(firstField?.fieldKey || ""));
                }}
              >
                <option value="">Select lead form</option>
                {leadForms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.name || "Untitled form"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-emerald-700">
                Which Question?
              </label>
              <select
                className="w-full border border-emerald-200 bg-white rounded-lg p-2.5 text-xs font-medium outline-none"
                value={draftData.linkedFieldKey || ""}
                onChange={(e) => {
                  applyLeadFormFieldSelection(String(draftData.linkedFormId || ""), e.target.value);
                }}
                disabled={!selectedLeadForm}
              >
                <option value="">Select question</option>
                {selectedLeadFormFields.map((field) => (
                  <option key={field.id || field.fieldKey} value={field.fieldKey}>
                    {field.questionLabel || field.fieldKey}
                  </option>
                ))}
              </select>
            </div>

            {leadForms.length === 0 ? (
              <div className="text-[11px] leading-5 text-emerald-800">
                No lead forms exist yet. Create one from the Lead Forms page first.
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {draftData.validation === 'regex' && (
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Regex Pattern</label>
          <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder="e.g. ^[A-Z]{3}$" value={draftData.regex || ""} onChange={(e) => updateData('regex', e.target.value)} />
        </div>
      )}

      {RenderTimeoutAndRetryLogic()}
    </div>
  );

  const RenderTriggerNode = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Keywords</label>
        <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-medium" placeholder="e.g. hi, hello, start" value={draftData.keywords || ""} onChange={(e) => updateData('keywords', e.target.value)} />
      </div>
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
        <input type="checkbox" checked={Boolean(draftData.isGlobalOverride)} onChange={(e) => updateData("isGlobalOverride", e.target.checked)} />
        Interrupt active flows globally
      </label>
    </div>
  );

  const RenderDelayNodeLogic = (label = "Delay Before Send (ms)") => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</label>
        <input
          type="number"
          min="0"
          step="100"
          className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs"
          placeholder="0"
          value={draftData.delayMs || ""}
          onChange={(e) => updateData("delayMs", Number(e.target.value || 0))}
        />
      </div>
    </div>
  );

  const RenderDelayNode = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration</label>
          <input
            type="number"
            min="0"
            className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs"
            placeholder="2"
            value={draftData.duration || ""}
            onChange={(e) => updateData("duration", Number(e.target.value || 0))}
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unit</label>
          <select
            className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs outline-none"
            value={draftData.unit || "seconds"}
            onChange={(e) => updateData("unit", e.target.value)}
          >
            <option value="seconds">Seconds</option>
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
          </select>
        </div>
      </div>
    </div>
  );

  const RenderApiNode = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div className="rounded-xl border border-violet-100 bg-violet-50 p-3 text-[11px] leading-5 text-violet-800">
        Send a live HTTP request to an external tool after the bot collects data. Use <span className="font-black">{"{{variable_name}}"}</span> placeholders in the URL, headers, and body.
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Method</label>
          <select className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs outline-none" value={draftData.method || "GET"} onChange={(e) => updateData("method", e.target.value)}>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Save Response To</label>
          <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder="api_response" value={draftData.saveTo || ""} onChange={(e) => updateData("saveTo", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Save Status To</label>
          <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder="api_status" value={draftData.statusSaveTo || ""} onChange={(e) => updateData("statusSaveTo", e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Timeout (ms)</label>
          <input type="number" min="0" step="100" className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs" placeholder="10000" value={draftData.timeoutMs || ""} onChange={(e) => updateData("timeoutMs", Number(e.target.value || 0))} />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">URL</label>
        <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder="https://api.example.com/orders" value={draftData.url || ""} onChange={(e) => updateData("url", e.target.value)} />
      </div>
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Headers (JSON)</label>
        <textarea className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono resize-none h-20" placeholder='{"Authorization":"Bearer {{crm_token}}","Content-Type":"application/json"}' value={draftData.headers || ""} onChange={(e) => updateData("headers", e.target.value)} />
      </div>
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">JSON Body</label>
        <textarea className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono resize-none h-24" placeholder='{"orderId":"{{order_id}}"}' value={draftData.body || ""} onChange={(e) => updateData("body", e.target.value)} />
      </div>
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Allowed Success Status Codes</label>
        <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder="200,201,202" value={draftData.successStatuses || ""} onChange={(e) => updateData("successStatuses", e.target.value)} />
      </div>
    </div>
  );

  const RenderReminderNode = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-5 text-slate-600">
        Reminder nodes send a follow-up message immediately when reached. For inactivity reminders on user responses, configure reminder/timeout settings on input or menu nodes.
      </div>
    </div>
  );

  const RenderTemplateNode = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Template Name</label>
          <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder="e.g. welcome_msg" value={draftData.templateName || ""} onChange={(e) => updateData('templateName', e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Language</label>
          <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder="en_US" value={draftData.language || ""} onChange={(e) => updateData('language', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Variables (CSV)</label>
        <textarea className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs resize-none h-16" placeholder='e.g. {{name}}, {{company}}' value={draftData.variables || ""} onChange={(e) => updateData('variables', e.target.value)} />
      </div>
    </div>
  );

  const RenderMediaNode = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Media Target</label>
        <div className="flex gap-2 mb-2">
          <input className="flex-1 border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder="https://..." value={draftData.media_url || draftData.url || ""} onChange={(e) => updateData('media_url', e.target.value)} />
          <label className="bg-blue-50 border border-blue-100 text-blue-600 px-3 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-100 flex items-center justify-center transition-all min-w-[70px]">
            {isUploading ? "..." : "Upload"}
            <input type="file" accept="image/*,video/*,application/pdf" className="hidden" onChange={handleMediaUpload} disabled={isUploading} />
          </label>
        </div>
      </div>
      {RenderDelayNodeLogic()}
    </div>
  );

  const RenderAssignAgentNode = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Global Handoff Keywords</label>
        <input
          className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-medium"
          placeholder="e.g. human, support, agent"
          value={draftData.keywords || ""}
          onChange={(e) => updateData("keywords", e.target.value)}
        />
      </div>
      <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">
        If keywords are provided, this node can act as a global interrupt and transfer the user to a human agent from any active flow.
      </div>
    </div>
  );

  const RenderEndNode = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Flow Escape Keywords</label>
        <input
          className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-medium"
          placeholder="e.g. cancel, stop, quit"
          value={draftData.keywords || ""}
          onChange={(e) => updateData("keywords", e.target.value)}
        />
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-5 text-slate-600">
        End nodes now reset the current flow and keep the conversation active for future triggers.
      </div>
    </div>
  );

  const RenderSystemTextNode = (hint: string) => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-5 text-slate-600">
        {hint}
      </div>
    </div>
  );

  const RenderGotoNode = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
        <button
          type="button"
          onClick={() => updateData('gotoType', 'node')}
          className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${gotoType === 'node' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
        >
          Internal Node
        </button>
        <button
          type="button"
          onClick={() => updateData('gotoType', 'flow')}
          className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${gotoType === 'flow' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
        >
          Bot Flow
        </button>
        <button
          type="button"
          onClick={() => updateData('gotoType', 'bot')}
          className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${gotoType === 'bot' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
        >
          Other Bot
        </button>
      </div>
      {gotoType === "node" ? (
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Target Node ID
          </label>
          <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder="n_123" value={draftData.targetNode || ""} onChange={(e) => updateData('targetNode', e.target.value)} />
        </div>
      ) : null}
      {gotoType === "flow" ? (
        <>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-[11px] leading-5 text-blue-800">
            Jump into another saved flow in this same bot. The target flow will start from its entry node.
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Target Flow
            </label>
            <select
              className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-medium outline-none"
              value={draftData.targetFlowId || ""}
              onChange={(e) => updateData('targetFlowId', e.target.value)}
            >
              <option value="">Select flow</option>
              {sameBotFlowOptions.map((flow) => (
                <option key={flow.id} value={flow.id}>
                  {flow.flow_name || flow.name || "Untitled flow"}{flow.is_default ? " (Default)" : ""}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : null}
      {gotoType === "bot" ? (
        <>
          <div className="rounded-lg border border-violet-100 bg-violet-50 p-3 text-[11px] leading-5 text-violet-800">
            Transfer the conversation into another bot in the same workspace. The target bot will continue from the selected flow or its default flow.
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Target Bot
            </label>
            <select
              className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-medium outline-none"
              value={draftData.targetBotId || ""}
              onChange={(e) => {
                const nextBotId = e.target.value;
                setDraftData((prev: any) => {
                  const next = {
                    ...prev,
                    targetBotId: nextBotId,
                    targetFlowId:
                      nextBotId && String(nextBotId) === String(prev.targetBotId || "")
                        ? prev.targetFlowId || ""
                        : "",
                  };
                  draftDataRef.current = next;
                  return next;
                });
              }}
            >
              <option value="">Select bot</option>
              {botOptions
                .filter((bot) => String(bot.id) !== String(currentBotId || ""))
                .map((bot) => (
                  <option key={bot.id} value={bot.id}>
                    {bot.name || "Untitled bot"}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Target Flow (Optional)
            </label>
            <select
              className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-medium outline-none"
              value={draftData.targetFlowId || ""}
              onChange={(e) => updateData('targetFlowId', e.target.value)}
              disabled={!selectedTargetBotId}
            >
              <option value="">Use bot default flow</option>
              {targetBotFlowOptions.map((flow) => (
                <option key={flow.id} value={flow.id}>
                  {flow.flow_name || flow.name || "Untitled flow"}{flow.is_default ? " (Default)" : ""}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : null}
    </div>
  );

  const RenderConditionNode = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Variable to Check</label>
        <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder="e.g. user_email" value={draftData.variable || ""} onChange={(e) => updateData('variable', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Operator</label>
          <select className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs outline-none" value={draftData.operator || "equals"} onChange={(e) => updateData('operator', e.target.value)}>
            <option value="equals">Equals</option>
            <option value="contains">Contains</option>
            <option value="exists">Exists</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Value</label>
          <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs" placeholder="e.g. test@gmail.com" value={draftData.value || ""} onChange={(e) => updateData('value', e.target.value)} />
        </div>
      </div>
    </div>
  );

  const RenderSaveNode = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data Variable</label>
          <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder="e.g. session_val" value={draftData.variable || ""} onChange={(e) => updateData('variable', e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lead DB Field</label>
          <input className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs font-mono" placeholder="e.g. name, email" value={draftData.leadField || draftData.field || ""} onChange={(e) => updateData('leadField', e.target.value)} />
        </div>
      </div>
    </div>
  );

  const RenderKnowledgeLookupNode = () => (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div className="rounded-xl border border-sky-100 bg-sky-50 p-3 text-[11px] leading-5 text-sky-800">
        Search the workspace knowledge base, store the matched documents, and optionally save merged text for the next message node.
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Lookup Query</label>
        <textarea className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono resize-none h-20" placeholder="Summarize the return policy for {{product_name}}" value={draftData.query || ""} onChange={(e) => updateData("query", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Save Results To</label>
          <input className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono" placeholder="knowledge_results" value={draftData.saveTo || ""} onChange={(e) => updateData("saveTo", e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Save Text To</label>
          <input className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono" placeholder="knowledge_text" value={draftData.saveTextTo || ""} onChange={(e) => updateData("saveTextTo", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Scope</label>
          <select className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none" value={draftData.scope || "project"} onChange={(e) => updateData("scope", e.target.value)}>
            <option value="project">Project</option>
            <option value="workspace">Workspace</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Result Limit</label>
          <input type="number" min="1" max="10" className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs" placeholder="3" value={draftData.limit || ""} onChange={(e) => updateData("limit", Number(e.target.value || 3))} />
        </div>
      </div>
    </div>
  );

  const renderSpecificNodeFields = () => {
    switch (node.type) {
      case 'input': return <RenderInputNode />;
      case 'menu_button': return RenderMenuOptionsNode(4, "Button");
      case 'menu_list': return RenderMenuOptionsNode(10, "List Item", true);
      case 'trigger': return <RenderTriggerNode />;
      case 'msg_text': return RenderDelayNodeLogic();
      case 'send_template': return <RenderTemplateNode />;
      case 'msg_media': return <RenderMediaNode />;
      case 'api': return <RenderApiNode />;
      case 'delay': return <RenderDelayNode />;
      case 'reminder': return <RenderReminderNode />;
      case 'assign_agent': return <RenderAssignAgentNode />;
      case 'end': return <RenderEndNode />;
      case 'error_handler': return RenderSystemTextNode("This node acts as the global fallback when retries are exhausted or no trigger matches.");
      case 'timeout': return RenderSystemTextNode("Use this node as a timeout target from input or menu nodes.");
      case 'resume_bot': return RenderSystemTextNode("This node returns the conversation from human mode back into bot mode.");
      case 'goto': return <RenderGotoNode />;
      case 'condition': return <RenderConditionNode />;
      case 'knowledge_lookup': return <RenderKnowledgeLookupNode />;
      case 'save': return <RenderSaveNode />;
      default: return null;
    }
  };

  return (
    <div 
      className="w-full h-full bg-white flex flex-col relative overflow-hidden nodrag nopan" 
      onPointerDownCapture={(e) => e.stopPropagation()}
      onPointerUpCapture={(e) => e.stopPropagation()}
      onMouseDownCapture={(e) => e.stopPropagation()}
      onMouseUpCapture={(e) => e.stopPropagation()}
      onClickCapture={(e) => e.stopPropagation()}
      onKeyDownCapture={(e) => e.stopPropagation()}
      onKeyUpCapture={(e) => e.stopPropagation()}
    >
      <div className="flex-1 overflow-y-auto p-5 pb-6 custom-scrollbar">
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Node Header (Label)</label>
            <input 
              className="w-full border-2 border-slate-200 bg-slate-50 focus:bg-white rounded-xl p-3 text-sm font-bold focus:border-blue-500 outline-none transition-all"
              placeholder="e.g. Greeting"
              value={draftData.label || ""}
              onChange={(e) => updateData('label', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Message Text / Notes</label>
            <textarea 
              className="w-full border-2 border-slate-200 bg-slate-50 focus:bg-white rounded-xl p-3 text-sm min-h-[100px] resize-none focus:border-blue-500 outline-none transition-all"
              placeholder="Content..."
              value={draftData.text || ""}
              onChange={(e) => updateData('text', e.target.value)}
            />
          </div>
        </div>
        {renderSpecificNodeFields()}
      </div>
      <div className="w-full p-4 border-t border-slate-200 bg-white shrink-0 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)] z-10">
        <button
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={handleSaveAndCloseClick}
          className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
        >
          Save & Close
        </button>
      </div>
    </div>
  );
}
