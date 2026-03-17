import { useState, useCallback } from "react";
import { Node, Edge } from "reactflow";

export function useFlowHistory(
  nodes: Node[], 
  edges: Edge[], 
  setNodes: (nodes: Node[]) => void, 
  setEdges: (edges: Edge[]) => void,
  setIsDirty: (dirty: boolean) => void
) {
  const [past, setPast] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [future, setFuture] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);

  const takeSnapshot = useCallback(() => {
    setPast((p) => [...p.slice(-20), { nodes, edges }]);
    setFuture([]);
    setIsDirty(true);
  }, [nodes, edges, setIsDirty]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((p) => p.slice(0, p.length - 1));
    setFuture((f) => [{ nodes, edges }, ...f]);
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setIsDirty(true);
  }, [past, nodes, edges, setNodes, setEdges, setIsDirty]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, { nodes, edges }]);
    setNodes(next.nodes);
    setEdges(next.edges);
    setIsDirty(true);
  }, [future, nodes, edges, setNodes, setEdges, setIsDirty]);

  return { takeSnapshot, undo, redo, past, future };
}