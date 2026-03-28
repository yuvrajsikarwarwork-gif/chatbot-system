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
import PageAccessNotice from "../components/access/PageAccessNotice";
import RequirePermission from "../components/access/RequirePermission";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useVisibility } from "../hooks/useVisibility";
import { flowService } from "../services/flowService";
import { leadFormService, type LeadFormRecord } from "../services/leadFormService";
import { botService } from "../services/botService";
import apiClient from "../services/apiClient";
import { useAuthStore } from "../store/authStore";
import { useBotStore } from "../store/botStore";
import { confirmAction, notify } from "../store/uiStore";
import { NODE_CATEGORIES, AUTO_SAVE_DELAY, formatDefaultLabel } from "../config/flowConstants";
import { useFlowHistory } from "../hooks/useFlowHistory";

const FLOW_CANVAS_NODE_TYPES: any = (() => {
  const types: any = { default: NodeComponent, message: NodeComponent };
  NODE_CATEGORIES.forEach((category) => {
    category.items.forEach((item) => {
      types[item.type] = NodeComponent;
    });
  });
  return types;
})();

function FlowBuilderCanvas() {
  const router = useRouter();
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace);
  const activeProject = useAuthStore((state) => state.activeProject);
  const hasWorkspacePermission = useAuthStore((state) => state.hasWorkspacePermission);
  const getProjectRole = useAuthStore((state) => state.getProjectRole);
  const { canViewPage } = useVisibility();
  
  const botId = router.query.botId as string;
  const { unlockedBotIds } = useBotStore();
  const isUnlocked = unlockedBotIds.includes(botId);
  const canEditWorkflow = hasWorkspacePermission(activeWorkspace?.workspace_id, "edit_workflow");
  const canDeleteFlowAction = hasWorkspacePermission(activeWorkspace?.workspace_id, "delete_flow");
  const canViewFlowsPage = canViewPage("flows");
  const projectRole = getProjectRole(activeProject?.id);
  const canEditProjectWorkflow =
    canEditWorkflow || projectRole === "project_admin" || projectRole === "editor";
  const canDeleteProjectFlow =
    canDeleteFlowAction || projectRole === "project_admin";

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { project, setViewport } = useReactFlow(); 
  
  const [nodes, setNodes, onNodesChangeState] = useNodesState([]);
  const [edges, setEdges, onEdgesChangeState] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [botMetadata, setBotMetadata] = useState<{ name: string } | null>(null);
  const [availableBots, setAvailableBots] = useState<any[]>([]); 
  const [handoffBots, setHandoffBots] = useState<any[]>([]);
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [currentFlowName, setCurrentFlowName] = useState("");
  const [flowNameDialogMode, setFlowNameDialogMode] = useState<"create" | "rename" | null>(null);
  const [flowNameDraft, setFlowNameDraft] = useState("");
  const [flowSummaries, setFlowSummaries] = useState<any[]>([]);
  const [flowOptionsByBot, setFlowOptionsByBot] = useState<Record<string, any[]>>({});
  const [leadForms, setLeadForms] = useState<LeadFormRecord[]>([]);
  const [allowedNodeTypes, setAllowedNodeTypes] = useState<string[]>([]);
  const [nodeDisabledReasons, setNodeDisabledReasons] = useState<Record<string, string>>({});
  const [hasClipboardSelection, setHasClipboardSelection] = useState(false);
  const flowClipboardRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const suppressNodeSelectionRef = useRef(false);

  const { takeSnapshot, undo, redo, past, future } = useFlowHistory(nodes, edges, setNodes, setEdges, setIsDirty);

  const normalizeFlowForCanvas = useCallback((flowJson: any) => {
    const rawNodes = Array.isArray(flowJson?.nodes)
      ? flowJson.nodes.map((node: any) => ({
          ...node,
          type: String(node?.type || "").trim().toLowerCase() === "message" ? "msg_text" : node?.type,
        }))
      : [];
    const rawEdges = Array.isArray(flowJson?.edges) ? flowJson.edges : [];

    const removedLeadFormNodeIds = new Set(
      rawNodes
        .filter((node: any) => String(node?.type || "").trim().toLowerCase() === "lead_form")
        .map((node: any) => String(node.id))
    );

    if (removedLeadFormNodeIds.size === 0) {
      return {
        ...(flowJson && typeof flowJson === "object" ? flowJson : {}),
        nodes: rawNodes,
        edges: rawEdges,
      };
    }

    const nodes = rawNodes.filter(
      (node: any) => !removedLeadFormNodeIds.has(String(node.id))
    );
    const incomingEdges = rawEdges.filter((edge: any) =>
      removedLeadFormNodeIds.has(String(edge.target))
    );
    const outgoingEdges = rawEdges.filter((edge: any) =>
      removedLeadFormNodeIds.has(String(edge.source))
    );
    const preservedEdges = rawEdges.filter(
      (edge: any) =>
        !removedLeadFormNodeIds.has(String(edge.source)) &&
        !removedLeadFormNodeIds.has(String(edge.target))
    );
    const stitchedEdges: any[] = [];

    incomingEdges.forEach((incoming: any) => {
      outgoingEdges
        .filter((candidate: any) => String(candidate.source) === String(incoming.target))
        .forEach((outgoing: any) => {
          stitchedEdges.push({
            ...outgoing,
            id: `frontend-migrated-${incoming.id}-${outgoing.id}`,
            source: incoming.source,
            sourceHandle: incoming.sourceHandle || null,
            target: outgoing.target,
            targetHandle: outgoing.targetHandle || null,
            selected: false,
          });
        });
    });

    const edges = [...preservedEdges, ...stitchedEdges].filter(
      (edge: any, index: number, collection: any[]) =>
        collection.findIndex(
          (candidate: any) =>
            String(candidate.source || "") === String(edge.source || "") &&
            String(candidate.sourceHandle || "") === String(edge.sourceHandle || "") &&
            String(candidate.target || "") === String(edge.target || "") &&
            String(candidate.targetHandle || "") === String(edge.targetHandle || "")
        ) === index
    );

    return {
      ...(flowJson && typeof flowJson === "object" ? flowJson : {}),
      nodes,
      edges,
    };
  }, []);

  const applyLoadedFlow = useCallback((payload: any) => {
    const flowJson = payload?.flow_json && typeof payload.flow_json === "object"
      ? payload.flow_json
      : payload;

    setCurrentFlowId(typeof payload?.id === "string" ? payload.id : null);
    setCurrentFlowName(String(payload?.flow_name || payload?.name || "").trim());
    const normalizedFlow = normalizeFlowForCanvas(flowJson);
    setNodes(normalizedFlow.nodes);
    setEdges(normalizedFlow.edges);
  }, [normalizeFlowForCanvas, setNodes, setEdges]);

  const refreshFlowSummariesSafe = useCallback(async (targetBotId: string) => {
    if (!targetBotId) return [];
    try {
      const summaries = await flowService.getFlowSummaries(targetBotId);
      const normalized = Array.isArray(summaries) ? summaries : [];
      setFlowSummaries(normalized);
      return normalized;
    } catch (error) {
      console.error("Flow summaries refresh failed:", error);
      return [];
    }
  }, []);

  useEffect(() => {
    if (selectedNode && !nodes.some(n => n.id === selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [nodes, selectedNode]);

  const onNodesChange = useCallback((changes: any) => {
    if (!canEditProjectWorkflow) return;
    onNodesChangeState(changes);
    setIsDirty(true);
  }, [canEditProjectWorkflow, onNodesChangeState]);

  const onEdgesChange = useCallback((changes: any) => {
    if (!canEditProjectWorkflow) return;
    onEdgesChangeState(changes);
    setIsDirty(true);
  }, [canEditProjectWorkflow, onEdgesChangeState]);

  const onConnect = useCallback((params: Connection | Edge) => {
    if (!canEditProjectWorkflow) return;
    takeSnapshot();
    setEdges((eds) => addEdge(params, eds));
    setIsDirty(true);
  }, [canEditProjectWorkflow, takeSnapshot, setEdges]);

  useEffect(() => {
    if (!router.isReady) return;
    if (!canViewFlowsPage) {
      setAvailableBots([]);
      setCurrentFlowId(null);
      setIsLoading(false);
      return;
    }
    
    const loadPortalData = async () => {
      try {
        setIsLoading(true);
        const botRows = await botService.getBots({
          workspaceId: activeWorkspace?.workspace_id || undefined,
          projectId: activeProject?.id || undefined,
        });
        const unlockedList = botRows.filter((b: any) => unlockedBotIds.includes(b.id));
        setAvailableBots(unlockedList);
        setHandoffBots(Array.isArray(botRows) ? botRows : []);

        const summariesByBotEntries = await Promise.all(
          (Array.isArray(botRows) ? botRows : []).map(async (bot: any) => {
            try {
              const summaries = await flowService.getFlowSummaries(bot.id);
              return [String(bot.id), Array.isArray(summaries) ? summaries : []] as const;
            } catch {
              return [String(bot.id), []] as const;
            }
          })
        );
        setFlowOptionsByBot(Object.fromEntries(summariesByBotEntries));

        if (activeWorkspace?.workspace_id) {
          try {
            const leadFormRows = await leadFormService.list(
              activeWorkspace.workspace_id,
              activeProject?.id || undefined
            );
            setLeadForms(Array.isArray(leadFormRows) ? leadFormRows : []);
          } catch {
            setLeadForms([]);
          }
        } else {
          setLeadForms([]);
        }

        if (botId && isUnlocked) {
          const botInfo = await apiClient.get(`/bots/${botId}`);
          setBotMetadata(botInfo.data);
          const capabilities = await flowService.getCapabilities(botId);
          setAllowedNodeTypes(Array.isArray(capabilities?.allowedNodeTypes) ? capabilities.allowedNodeTypes : []);
          setNodeDisabledReasons(
            capabilities?.disabledReasons && typeof capabilities.disabledReasons === "object"
              ? capabilities.disabledReasons
              : {}
          );
          const summaries = await refreshFlowSummariesSafe(botId);
          const initialFlowId =
            (typeof router.query.flowId === "string" && router.query.flowId) ||
            summaries?.[0]?.id ||
            undefined;
          const data = await flowService.getFlow(botId, initialFlowId);
          applyLoadedFlow(data);
        } else {
          setCurrentFlowId(null);
          setCurrentFlowName("");
          setFlowSummaries([]);
          setLeadForms([]);
          setAllowedNodeTypes([]);
          setNodeDisabledReasons({});
        }
      } catch (err: any) {
        console.error("Session initialization failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPortalData();
  }, [
    botId,
    isUnlocked,
    unlockedBotIds,
    router.isReady,
    applyLoadedFlow,
    refreshFlowSummariesSafe,
    activeWorkspace?.workspace_id,
    activeProject?.id,
    canViewFlowsPage,
  ]);

  const openCreateFlowDialog = useCallback(() => {
    const nextIndex = (flowSummaries?.length || 0) + 1;
    setFlowNameDraft(`Flow ${nextIndex}`);
    setFlowNameDialogMode("create");
  }, [flowSummaries.length]);

  const openRenameFlowDialog = useCallback(() => {
    if (!currentFlowId) {
      return;
    }
    setFlowNameDraft(currentFlowName || "Untitled flow");
    setFlowNameDialogMode("rename");
  }, [currentFlowId, currentFlowName]);

  const closeFlowNameDialog = useCallback(() => {
    setFlowNameDialogMode(null);
    setFlowNameDraft("");
  }, []);

  const handleCreateFlow = useCallback(async (requestedName: string) => {
    if (!botId || !canEditProjectWorkflow) {
      return;
    }

    const created = await flowService.createFlow(
      botId,
      {
        nodes: [
          {
            id: `node-start-${Date.now()}`,
            type: "start",
            position: { x: 250, y: 150 },
            data: { label: "Start", text: "" },
          },
        ],
        edges: [],
      },
      requestedName,
      flowSummaries.length === 0
    );

    await refreshFlowSummariesSafe(botId);
    applyLoadedFlow(created);
    setSelectedNode(null);
    setIsDirty(false);
  }, [applyLoadedFlow, botId, canEditProjectWorkflow, flowSummaries.length, refreshFlowSummariesSafe]);

  const handleRenameFlow = useCallback(async (nextName: string) => {
    if (!botId || !currentFlowId || !canEditProjectWorkflow) {
      return;
    }

    setIsSaving(true);
    try {
      const saved = await flowService.saveFlow(
        botId,
        { nodes, edges },
        currentFlowId,
        nextName
      );
      setCurrentFlowName(String(saved?.flow_name || nextName).trim());
      await refreshFlowSummariesSafe(botId);
      setIsDirty(false);
      notify("Flow name updated.", "success");
    } catch (err) {
      console.error("Rename flow error", err);
      notify("Failed to rename flow.", "error");
    } finally {
      setIsSaving(false);
    }
  }, [botId, canEditProjectWorkflow, currentFlowId, nodes, edges, refreshFlowSummariesSafe]);

  const handleSubmitFlowNameDialog = useCallback(async () => {
    const nextName = flowNameDraft.trim();
    if (!nextName) {
      notify("Flow name is required.", "error");
      return;
    }

    if (flowNameDialogMode === "create") {
      await handleCreateFlow(nextName);
      closeFlowNameDialog();
      return;
    }

    if (flowNameDialogMode === "rename") {
      await handleRenameFlow(nextName);
      closeFlowNameDialog();
    }
  }, [closeFlowNameDialog, flowNameDialogMode, flowNameDraft, handleCreateFlow, handleRenameFlow]);

  const persistFlow = useCallback(async (nextNodes = nodes, nextEdges = edges, force = false) => {
    if (!botId || !isUnlocked || !canEditProjectWorkflow) return false;
    if (!force && !isDirty) return true;

    setIsSaving(true);
    try {
      const saved = await flowService.saveFlow(
        botId,
        { nodes: nextNodes, edges: nextEdges },
        currentFlowId || undefined,
        currentFlowName.trim() || undefined
      );
      setCurrentFlowId(saved?.id || currentFlowId);
      setCurrentFlowName(String(saved?.flow_name || currentFlowName).trim());
      if (saved?.id) {
        await refreshFlowSummariesSafe(botId);
      }
      setIsDirty(false);
      return true;
    } catch (err) { 
      console.error("Save error", err); 
      notify("Failed to save workflow.", "error");
      return false;
    } finally {
      setTimeout(() => setIsSaving(false), 800);
    }
  }, [botId, nodes, edges, isDirty, isUnlocked, currentFlowId, currentFlowName, canEditProjectWorkflow, refreshFlowSummariesSafe]);

  const handleSave = useCallback(async () => {
    await persistFlow(nodes, edges, false);
  }, [persistFlow, nodes, edges]);

  const suppressNodeReselect = useCallback(() => {
    suppressNodeSelectionRef.current = true;
    window.setTimeout(() => {
      suppressNodeSelectionRef.current = false;
    }, 600);
  }, []);

  const handleNodeSaveAndClose = useCallback(async (newData: any) => {
    if (!selectedNode) {
      setSelectedNode(null);
      return;
    }

    suppressNodeReselect();

    const nextNodes = nodes.map((node) =>
      node.id === selectedNode.id ? { ...node, data: newData } : node
    );

    setNodes(nextNodes);
    setSelectedNode(null);
    setIsDirty(true);

    const saved = await persistFlow(nextNodes, edges, true);
    if (!saved) {
      notify("Node changes were applied locally, but flow save failed.", "error");
    }
  }, [selectedNode, nodes, edges, persistFlow, setNodes, suppressNodeReselect]);

  const handleCloseNodeEditor = useCallback(() => {
    suppressNodeReselect();
    setSelectedNode(null);
  }, [suppressNodeReselect]);

  const handleCloseBuilder = useCallback(async () => {
    if (isSaving) {
      return;
    }

    try {
      if (isDirty && canEditProjectWorkflow) {
        const saved = await persistFlow(nodes, edges, false);
        if (!saved) {
          return;
        }
      }
      await router.push("/bots");
    } catch (err) {
      console.error("Close builder error", err);
      notify("Failed to save workflow before closing.", "error");
    }
  }, [canEditProjectWorkflow, persistFlow, nodes, edges, isDirty, isSaving, router]);

  const handleSelectFlow = useCallback(async (flowId: string) => {
    if (!botId || !flowId) {
      return;
    }

    try {
      if (isDirty) {
        const saved = await persistFlow(nodes, edges, false);
        if (!saved) {
          return;
        }
      }
      setIsLoading(true);
      const data = await flowService.getFlow(botId, flowId);
      applyLoadedFlow(data);
      setSelectedNode(null);
      setIsDirty(false);
    } catch (err) {
      console.error("Failed to load selected flow", err);
      notify("Failed to load flow.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [applyLoadedFlow, botId, persistFlow, nodes, edges, isDirty]);

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

  const copySelected = useCallback(async () => {
    const selectedNodes = nodes.filter((node) => node.selected);
    if (!selectedNodes.length) {
      notify("Select one or more nodes first.", "error");
      return;
    }

    const selectedNodeIds = new Set(selectedNodes.map((node) => String(node.id)));
    const selectedEdges = edges.filter(
      (edge) =>
        selectedNodeIds.has(String(edge.source)) &&
        selectedNodeIds.has(String(edge.target))
    );

    const payload = {
      nodes: selectedNodes.map((node) => ({
        ...node,
        selected: false,
      })),
      edges: selectedEdges.map((edge) => ({
        ...edge,
        selected: false,
      })),
    };

    flowClipboardRef.current = payload;
    setHasClipboardSelection(true);

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload));
    } catch {}

    notify(`Copied ${selectedNodes.length} node${selectedNodes.length === 1 ? "" : "s"}.`, "success");
  }, [nodes, edges]);

  const pasteSelected = useCallback(async () => {
    if (!canEditProjectWorkflow) return;

    let payload = flowClipboardRef.current;
    if (!payload) {
      try {
        const text = await navigator.clipboard.readText();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed?.nodes) && Array.isArray(parsed?.edges)) {
          payload = parsed;
        }
      } catch {}
    }

    if (!payload?.nodes?.length) {
      notify("No copied nodes are available to paste.", "error");
      return;
    }

    takeSnapshot();
    const timestamp = Date.now();
    const idMap = new Map<string, string>();
    const pastedNodes: Node[] = payload.nodes.map((node, index) => {
      const nextId = `${String(node.id)}-copy-${timestamp}-${index}`;
      idMap.set(String(node.id), nextId);
      return {
        ...node,
        id: nextId,
        selected: true,
        position: {
          x: Number(node.position?.x || 0) + 60,
          y: Number(node.position?.y || 0) + 60,
        },
      };
    });
    const pastedEdges: Edge[] = payload.edges
      .filter((edge) => idMap.has(String(edge.source)) && idMap.has(String(edge.target)))
      .map((edge, index) => ({
        ...edge,
        id: `${String(edge.id || `edge-${index}`)}-copy-${timestamp}-${index}`,
        source: idMap.get(String(edge.source)) || String(edge.source),
        target: idMap.get(String(edge.target)) || String(edge.target),
        selected: true,
      }));

    setNodes((nds) => {
      const clearedNodes: Node[] = nds.map((node) => ({ ...node, selected: false }));
      return [...clearedNodes, ...pastedNodes];
    });
    setEdges((eds) => {
      const clearedEdges: Edge[] = eds.map((edge) => ({ ...edge, selected: false }));
      return [...clearedEdges, ...pastedEdges];
    });
    setIsDirty(true);
    notify(`Pasted ${pastedNodes.length} node${pastedNodes.length === 1 ? "" : "s"}.`, "success");
  }, [canEditProjectWorkflow, setNodes, setEdges, takeSnapshot]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (!canEditProjectWorkflow) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); selectAll(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') { e.preventDefault(); copySelected().catch?.(() => undefined); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') { e.preventDefault(); pasteSelected().catch?.(() => undefined); }
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, deleteSelected, selectAll, copySelected, pasteSelected, canEditProjectWorkflow]);

  const onAddNode = (type: string) => {
    if (!canEditProjectWorkflow) return;
    if (allowedNodeTypes.length > 0 && !allowedNodeTypes.includes(type)) {
      notify(nodeDisabledReasons[type] || "This node is not available for the current workspace.", "error");
      return;
    }
    takeSnapshot();
    const offset = (nodes.length % 15) * 30; 
    const newNode: Node = { id: `node-${Date.now()}`, type, position: { x: 300 + offset, y: 150 + offset }, data: { label: formatDefaultLabel(type), text: "" } };
    setNodes((nds) => nds.concat(newNode));
    setIsDirty(true);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!canEditProjectWorkflow) return;
    const type = e.dataTransfer.getData('application/reactflow');
    if (!type || !reactFlowWrapper.current) return;
    if (allowedNodeTypes.length > 0 && !allowedNodeTypes.includes(type)) {
      notify(nodeDisabledReasons[type] || "This node is not available for the current workspace.", "error");
      return;
    }
    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = project({ x: e.clientX - reactFlowBounds.left, y: e.clientY - reactFlowBounds.top });
    takeSnapshot();
    const newNode: Node = { id: `node-${Date.now()}`, type, position, data: { label: formatDefaultLabel(type), text: "" } };
    setNodes((nds) => nds.concat(newNode));
    setIsDirty(true);
  }, [setNodes, takeSnapshot, project, canEditProjectWorkflow, allowedNodeTypes, nodeDisabledReasons]);

  const onUpdateNodeData = (newData: any) => {
    if (!canEditProjectWorkflow) return;
    takeSnapshot();
    setNodes((nds) => nds.map((node) => (node.id === selectedNode?.id ? { ...node, data: newData } : node)));
    setSelectedNode((prev) => (prev ? { ...prev, data: newData } : null));
    setIsDirty(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEditProjectWorkflow) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
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
      } catch (err) { notify("Error parsing JSON.", "error"); }
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

  const handleDeleteFlow = useCallback(async () => {
    if (!currentFlowId || !botId || isSaving) {
      return;
    }
    if (!canDeleteProjectFlow) {
      notify("You do not have permission to remove workflows.", "error");
      return;
    }

    const confirmed = await confirmAction(
      "Remove workflow?",
      "This will permanently delete the current workflow for this bot. This action cannot be undone.",
      "Remove Flow",
      "Keep Flow"
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    try {
      await flowService.deleteFlow(currentFlowId);
      notify("Workflow removed.", "success");

      const nextFlow = await flowService.getFlow(botId);
      applyLoadedFlow(nextFlow);
      setSelectedNode(null);
      setIsDirty(false);
    } catch (err) {
      console.error("Delete flow error", err);
      notify("Failed to remove workflow.", "error");
    } finally {
      setIsSaving(false);
    }
  }, [applyLoadedFlow, botId, currentFlowId, isSaving, canDeleteProjectFlow]);

  if (!canViewFlowsPage) {
    return (
      <DashboardLayout>
        <PageAccessNotice
          title="Flow builder is restricted for this role"
          description="Only workspace admins and project operators with workflow access can open the flow builder."
          href="/"
          ctaLabel="Open dashboard"
        />
      </DashboardLayout>
    );
  }

  if (isLoading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white font-black animate-pulse tracking-tighter uppercase">Loading Workflow...</div>;

  if (!botId || !isUnlocked) {
    return (
      <DashboardLayout>
        <FlowPortal availableBots={availableBots} embedded />
      </DashboardLayout>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F8FAFC] overflow-hidden font-sans">
        <RequirePermission
          permissionKey="edit_workflow"
          fallback={
            <FlowHeader
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
              botName={botMetadata?.name}
              botId={botId}
              canEditWorkflow={false}
              canDeleteFlowAction={canDeleteProjectFlow}
              flowSummaries={flowSummaries}
              currentFlowId={currentFlowId}
              currentFlowName={currentFlowName}
              onSelectFlow={handleSelectFlow}
              onCreateFlow={openCreateFlowDialog}
              onEditFlowName={openRenameFlowDialog}
              onDownloadSample={handleDownloadSample}
              fileInputRef={fileInputRef}
              onFileUpload={handleFileUpload}
              onUndo={undo}
              onRedo={redo}
              canUndo={past.length > 0}
              canRedo={future.length > 0}
              onDeleteSelected={deleteSelected}
              onCopySelected={copySelected}
              onPasteSelected={pasteSelected}
              onDeleteFlow={handleDeleteFlow}
              onSave={handleSave}
              onCloseBuilder={handleCloseBuilder}
              isDirty={isDirty}
              isSaving={isSaving}
              canDeleteFlow={Boolean(currentFlowId)}
              canPasteSelection={hasClipboardSelection}
            />
          }
        >
        <FlowHeader
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          botName={botMetadata?.name}
          botId={botId}
          canEditWorkflow={canEditProjectWorkflow}
          canDeleteFlowAction={canDeleteProjectFlow}
          flowSummaries={flowSummaries}
          currentFlowId={currentFlowId}
          currentFlowName={currentFlowName}
          onSelectFlow={handleSelectFlow}
          onCreateFlow={openCreateFlowDialog}
          onEditFlowName={openRenameFlowDialog}
          onDownloadSample={handleDownloadSample}
        fileInputRef={fileInputRef}
        onFileUpload={handleFileUpload}
        onUndo={undo}
        onRedo={redo}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onDeleteSelected={deleteSelected}
        onCopySelected={copySelected}
        onPasteSelected={pasteSelected}
        onDeleteFlow={handleDeleteFlow}
        onSave={handleSave}
        onCloseBuilder={handleCloseBuilder}
        isDirty={isDirty}
        isSaving={isSaving}
        canDeleteFlow={Boolean(currentFlowId)}
        canPasteSelection={hasClipboardSelection}
      />
      </RequirePermission>

      <div className="flex-1 flex overflow-hidden relative">
        {flowNameDialogMode ? (
          <div className="absolute inset-0 z-[70] flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-[2px]">
            <div className="w-full max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {flowNameDialogMode === "create" ? "Create Flow" : "Rename Flow"}
              </div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">
                {flowNameDialogMode === "create" ? "Name the new flow" : "Update flow name"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {flowNameDialogMode === "create"
                  ? "Create a separate workflow for this bot with a clear name."
                  : "Change the current flow name without leaving the builder."}
              </p>
              <input
                autoFocus
                value={flowNameDraft}
                onChange={(event) => setFlowNameDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSubmitFlowNameDialog().catch(() => undefined);
                  }
                }}
                placeholder="Flow name"
                className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
              />
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeFlowNameDialog}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitFlowNameDialog().catch(() => undefined)}
                  className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-black"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <FlowSidebar
          isOpen={isSidebarOpen}
          onAddNode={onAddNode}
          canEditWorkflow={canEditProjectWorkflow}
          allowedNodeTypes={allowedNodeTypes}
          disabledReasons={nodeDisabledReasons}
        />

        <div className="flex-1 relative w-full h-full" ref={reactFlowWrapper} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
          {!canEditProjectWorkflow ? (
            <div className="absolute left-1/2 top-5 z-50 -translate-x-1/2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700 shadow-sm">
              Read-only workflow mode
            </div>
          ) : null}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => {
              if (suppressNodeSelectionRef.current) {
                return;
              }
              setSelectedNode(n);
            }}
            onPaneClick={() => setSelectedNode(null)}
            nodeTypes={FLOW_CANVAS_NODE_TYPES}
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
          <Panel
                position="top-right"
                className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl w-[350px] h-[85%] overflow-hidden flex flex-col mr-6 mt-6 animate-in slide-in-from-right-8 z-50"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-14 bg-slate-900 flex items-center justify-between px-5 shrink-0">
                  <span className="text-xs font-black text-white uppercase tracking-widest">Edit Node Data</span>
                  <button onClick={handleCloseNodeEditor} className="text-slate-400 hover:text-white"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                  <NodeEditor
                    node={selectedNode}
                    onUpdate={onUpdateNodeData}
                    onSaveAndClose={handleNodeSaveAndClose}
                    onClose={handleCloseNodeEditor}
                    currentBotId={botId}
                    currentFlowId={currentFlowId}
                    flowOptions={flowSummaries}
                    botOptions={handoffBots}
                    flowOptionsByBot={flowOptionsByBot}
                    leadForms={leadForms}
                  />
                  {!canEditProjectWorkflow ? (
                    <div className="absolute inset-0 bg-white/55 backdrop-blur-[1px]" />
                  ) : null}
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
