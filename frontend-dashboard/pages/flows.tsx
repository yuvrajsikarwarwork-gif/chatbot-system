import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import ReactFlow, { 
  useNodesState, useEdgesState, addEdge, Connection, Node, Edge, 
  Background, Controls, SelectionMode, Panel, ReactFlowProvider, useReactFlow
} from "reactflow";
import "reactflow/dist/style.css";
import { X } from "lucide-react";

import NodeEditor from "../components/flow/NodeEditor";
import NodeComponent from "../components/flow/NodeComponent";
import FlowPortal from "../components/flow/FlowPortal";
import FlowHeader from "../components/flow/FlowHeader";
import FlowSidebar from "../components/flow/FlowSidebar";
import { flowService } from "../services/flowService";
import apiClient from "../services/apiClient"; 
import { useBotStore } from "../store/botStore";
import { NODE_CATEGORIES, AUTO_SAVE_DELAY, formatDefaultLabel } from "../config/flowConstants";
import { useFlowHistory } from "../hooks/useFlowHistory";

function FlowBuilderCanvas() {
  const router = useRouter();
  
  const botId = router.query.botId as string;
  const { unlockedBotIds } = useBotStore();
  const isUnlocked = unlockedBotIds.includes(botId);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { project, setViewport } = useReactFlow(); 
  
  const [nodes, setNodes, onNodesChangeState] = useNodesState([]);
  const [edges, setEdges, onEdgesChangeState] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [botMetadata, setBotMetadata] = useState<{ name: string } | null>(null);
  const [availableBots, setAvailableBots] = useState<any[]>([]); 

  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { takeSnapshot, undo, redo, past, future } = useFlowHistory(nodes, edges, setNodes, setEdges, setIsDirty);

  const nodeTypes = useMemo(() => {
    const types: any = { default: NodeComponent };
    NODE_CATEGORIES.forEach(cat => cat.items.forEach(node => types[node.type] = NodeComponent));
    return types;
  }, []);

  useEffect(() => {
    if (selectedNode && !nodes.some(n => n.id === selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [nodes, selectedNode]);

  const onNodesChange = useCallback((changes: any) => {
    onNodesChangeState(changes);
    setIsDirty(true);
  }, [onNodesChangeState]);

  const onEdgesChange = useCallback((changes: any) => {
    onEdgesChangeState(changes);
    setIsDirty(true);
  }, [onEdgesChangeState]);

  const onConnect = useCallback((params: Connection | Edge) => {
    takeSnapshot();
    setEdges((eds) => addEdge(params, eds));
    setIsDirty(true);
  }, [takeSnapshot, setEdges]);

  useEffect(() => {
    if (!router.isReady) return;
    
    const loadPortalData = async () => {
      try {
        setIsLoading(true);
        const res = await apiClient.get("/bots");
        const unlockedList = res.data.filter((b: any) => unlockedBotIds.includes(b.id));
        setAvailableBots(unlockedList);

        if (botId && isUnlocked) {
          const botInfo = await apiClient.get(`/bots/${botId}`);
          setBotMetadata(botInfo.data);
          const data = await flowService.getFlow(botId);
          setNodes(data.nodes || []);
          setEdges(data.edges || []);
        }
      } catch (err: any) {
        console.error("Session initialization failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPortalData();
  }, [botId, isUnlocked, unlockedBotIds, router.isReady]);

  const handleSave = useCallback(async () => {
    if (!botId || !isDirty || !isUnlocked) return;
    setIsSaving(true);
    try {
      await flowService.saveFlow(botId, { nodes, edges });
      setIsDirty(false);
    } catch (err) { 
      console.error("Save error", err); 
    } finally {
      setTimeout(() => setIsSaving(false), 800);
    }
  }, [botId, nodes, edges, isDirty, isUnlocked]);

  useEffect(() => {
    if (isDirty) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(handleSave, AUTO_SAVE_DELAY);
    }
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [isDirty, handleSave]);

  const deleteSelected = useCallback(() => {
    takeSnapshot();
    setNodes((nds) => nds.filter((node) => !node.selected));
    setEdges((eds) => eds.filter((edge) => !edge.selected));
    setSelectedNode(null); 
    setIsDirty(true);
  }, [takeSnapshot, setNodes, setEdges]);

  const selectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
    setEdges((eds) => eds.map((e) => ({ ...e, selected: true })));
  }, [setNodes, setEdges]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); selectAll(); }
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, deleteSelected, selectAll]);

  const onAddNode = (type: string) => {
    takeSnapshot();
    const offset = (nodes.length % 15) * 30; 
    const newNode: Node = { id: `node-${Date.now()}`, type, position: { x: 300 + offset, y: 150 + offset }, data: { label: formatDefaultLabel(type), text: "" } };
    setNodes((nds) => nds.concat(newNode));
    setIsDirty(true);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/reactflow');
    if (!type || !reactFlowWrapper.current) return;
    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = project({ x: e.clientX - reactFlowBounds.left, y: e.clientY - reactFlowBounds.top });
    takeSnapshot();
    const newNode: Node = { id: `node-${Date.now()}`, type, position, data: { label: formatDefaultLabel(type), text: "" } };
    setNodes((nds) => nds.concat(newNode));
    setIsDirty(true);
  }, [setNodes, takeSnapshot, project]);

  const onUpdateNodeData = (newData: any) => {
    takeSnapshot();
    setNodes((nds) => nds.map((node) => (node.id === selectedNode?.id ? { ...node, data: newData } : node)));
    setSelectedNode((prev) => (prev ? { ...prev, data: newData } : null));
    setIsDirty(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.nodes && Array.isArray(json.nodes)) {
          takeSnapshot(); setNodes(json.nodes); setEdges(json.edges || []); setIsDirty(true);
          setViewport({ x: 0, y: 0, zoom: 1 });
        }
      } catch (err) { alert("Error parsing JSON"); }
      if (fileInputRef.current) fileInputRef.current.value = ""; 
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const sampleData = { nodes: [{ id: "node-start", type: "start", position: { x: 250, y: 150 }, data: { label: "Start", text: "" } }], edges: [] };
    const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "sample-flow.json"; document.body.appendChild(link);
    link.click(); document.body.removeChild(link);
  };

  const onInit = useCallback((reactFlowInstance: any) => {
    reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 });
  }, []);

  if (isLoading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white font-black animate-pulse tracking-tighter uppercase">Booting Engine...</div>;

  if (!botId || !isUnlocked) return <FlowPortal availableBots={availableBots} />;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F8FAFC] overflow-hidden font-sans">
      <FlowHeader 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        botName={botMetadata?.name}
        botId={botId}
        onDownloadSample={handleDownloadSample}
        fileInputRef={fileInputRef}
        onFileUpload={handleFileUpload}
        onUndo={undo}
        onRedo={redo}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onDeleteSelected={deleteSelected}
        onSave={handleSave}
        isDirty={isDirty}
        isSaving={isSaving}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <FlowSidebar isOpen={isSidebarOpen} onAddNode={onAddNode} />

        <div className="flex-1 relative w-full h-full" ref={reactFlowWrapper} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelectedNode(n)}
            onPaneClick={() => setSelectedNode(null)}
            nodeTypes={nodeTypes}
            panOnDrag={true}
            selectionOnDrag={false}
            selectionMode={SelectionMode.Partial}
            multiSelectionKeyCode="Shift"
            selectionKeyCode="Shift"
            panOnScroll={true}
            deleteKeyCode={null}
            onInit={onInit} 
            className="bg-[#f1f5f9]"
          >
            <Background color="#ccc" gap={20} size={1} />
            <Controls className="mb-4 ml-4 shadow-xl border-none" />
            
            {selectedNode && (
              <Panel position="top-right" className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl w-[350px] h-[85%] overflow-hidden flex flex-col mr-6 mt-6 animate-in slide-in-from-right-8 z-50">
                <div className="h-14 bg-slate-900 flex items-center justify-between px-5 shrink-0">
                  <span className="text-xs font-black text-white uppercase tracking-widest">Edit Node Data</span>
                  <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                  <NodeEditor node={selectedNode} onUpdate={onUpdateNodeData} onClose={() => setSelectedNode(null)} />
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

export default function FlowBuilderPageWrapper() {
  return (
    <ReactFlowProvider>
      <FlowBuilderCanvas />
    </ReactFlowProvider>
  );
}