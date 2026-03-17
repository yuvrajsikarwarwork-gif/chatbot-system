import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,A
  SelectionMode,
} from "reactflow";
import "reactflow/dist/style.css";
import NodeComponent from "./NodeComponent";

interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
  nodeTypes?: any;
}

export default function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  nodeTypes = { default: NodeComponent },
}: FlowCanvasProps) {
  return (
    <div className="w-full h-full bg-slate-50 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        panOnScroll={true}
        selectionOnDrag={true} // Enables click-and-drag multi-select
        panOnDrag={[1, 2]} // Allows panning with middle or right click
        selectionMode={SelectionMode.Partial}
        fitView
      >
        <Background color="#ccc" gap={16} />
        {/* Added bottom margin to prevent the lock icon from being cut off */}
        <Controls className="mb-8 ml-4 shadow-lg border-slate-200" />
      </ReactFlow>
    </div>
  );
}