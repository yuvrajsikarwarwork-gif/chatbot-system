import { Handle, Position, useReactFlow } from "reactflow";
import { X, Hash, Headset, Bot, RotateCcw, Link } from "lucide-react";

export default function NodeComponent({ id, data, type, selected }: any) {
  const { setNodes, setEdges } = useReactFlow();
  const handleSize = 18;
  const handleOffset = -9;
  const handleClassName = "border-2 border-card rounded-full";
  const sideHandleClassName = `${handleClassName} absolute top-1/2 -translate-y-1/2`;
  const baseHandleStyle = {
    width: handleSize,
    height: handleSize,
    borderWidth: 2,
    borderRadius: 9999,
  } as const;
  const sideHandleStyle = {
    ...baseHandleStyle,
    right: handleOffset,
    top: "50%",
    transform: "translateY(-50%)",
  } as const;

  const isButtonNode = type === "menu_button";
  const isListNode = type === "menu_list";
  const isConditionNode = type === "condition";
  const isEndNode = type === "end" || type === "timeout";
  const isGotoNode = type === "goto";
  const isAgentNode = type === "assign_agent";
  const isResumeNode = type === "resume_bot";
  const isInputNode = type === "input";
  const isApiNode = type === "api";
  const isWaitingNode = isInputNode || isButtonNode || isListNode;
  const isErrorHandler = type === "error_handler";
  const isStartNode = type === "start" || type === "trigger";
  const isGlobalOverride = type === "trigger" && Boolean(data?.isGlobalOverride);

  const maxItems = isButtonNode ? 4 : isListNode ? 10 : 0;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((node) => node.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  return (
    <div
      className={`bg-card rounded-xl min-w-[220px] overflow-hidden relative group transition-all border ${
        selected
          ? "border-primary shadow-[0_0_15px_var(--primary-fade)] scale-[1.02]"
          : "border-border shadow-sm hover:border-primary/50"
      } ${isErrorHandler ? "border-dashed" : "border-solid"}`}
    >
      <button
        onClick={handleDelete}
        className="absolute top-2 right-2 text-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-card rounded-full p-0.5"
      >
        <X size={14} strokeWidth={3} />
      </button>

      {!isStartNode && !isErrorHandler && (
        <Handle
          type="target"
          position={Position.Left}
          className={handleClassName}
          style={{ ...baseHandleStyle, background: "var(--muted)", left: handleOffset }}
        />
      )}

      <div
        className={`p-2.5 border-b flex items-center justify-between pr-8 ${
          isErrorHandler ? "bg-primary-fade border-primary/20" : "bg-background border-border"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`text-[10px] font-black uppercase tracking-widest truncate ${
              isErrorHandler ? "text-primary" : "text-muted"
            }`}
          >
            {data.label || type.replace("_", " ")}
          </span>
          {isGlobalOverride ? (
            <span className="rounded-full bg-primary-fade px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.18em] text-primary">
              Global
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1 bg-card px-1.5 py-0.5 rounded text-[8px] font-mono text-muted border border-border">
          <Hash size={8} />
          {id.slice(-4)}
        </div>
      </div>

      <div className="p-3 text-xs text-muted font-medium">
        {isInputNode ? (
          <div className="space-y-2">
            <p className="truncate max-w-[180px]">{data.text || "Configure question..."}</p>
            <div className="flex items-center gap-1 text-[9px] italic font-bold">
              <RotateCcw size={10} className="text-muted" /> Type 'reset' to rewrite
            </div>
          </div>
        ) : isGotoNode ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[9px] text-primary font-black uppercase tracking-tight">
              <Link size={10} />{" "}
              {data.gotoType === "bot"
                ? "Other Bot"
                : data.gotoType === "flow"
                  ? "Bot Flow"
                  : "Internal Node"}
            </div>
            <p
              className={`truncate font-bold bg-background p-1 rounded border ${
                !data.targetNode && !data.targetBotId
                  ? "text-primary border-primary/30 animate-pulse"
                  : "text-foreground border-border"
              }`}
            >
              {data.gotoType === "flow"
                ? data.targetFlowId || "Unconfigured"
                : data.targetNode || data.targetBotId || "Unconfigured"}
            </p>
          </div>
        ) : isAgentNode ? (
          <div className="flex items-center gap-2 text-primary">
            <Headset size={14} />
            <span className="text-[10px] font-bold uppercase">Handoff to Human</span>
          </div>
        ) : isApiNode ? (
          <div className="space-y-1">
            <div className="text-[9px] font-black uppercase tracking-wide text-primary">
              {String(data.method || "GET").toUpperCase()}
            </div>
            <p className="truncate font-mono text-[10px] text-foreground">
              {data.url || "https://api.example.com"}
            </p>
            <p className="text-[9px] text-muted">Save to: {data.saveTo || "api_response"}</p>
          </div>
        ) : isResumeNode ? (
          <div className="flex items-center gap-2 text-primary">
            <Bot size={14} />
            <span className="text-[10px] font-bold uppercase">Resume automation</span>
          </div>
        ) : isErrorHandler ? (
          <p className="italic text-primary text-[10px]">Active globally for all errors</p>
        ) : data.text ? (
          <div className="space-y-1">
            <p className="truncate max-w-[180px] text-foreground">{data.text}</p>
            {Number(data.delayMs || 0) > 0 ? (
              <p className="text-[9px] font-bold uppercase tracking-wide text-muted">
                Delay {Number(data.delayMs)} ms
              </p>
            ) : null}
          </div>
        ) : (
          <p className="italic text-muted">Configure node...</p>
        )}
      </div>

      {maxItems > 0 && (
        <div className="border-t border-border bg-background flex flex-col">
          {Array.from({ length: maxItems }, (_, i) => i + 1).map((num) => {
            const itemText = data[`item${num}`];
            if (!itemText && num > 1) return null;
            return (
              <div
                key={num}
                className="relative p-2 text-[10px] font-bold text-center border-b border-border last:border-0 text-muted"
              >
                <span className="truncate block px-2">{itemText || `Item ${num}`}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`item${num}`}
                  className={sideHandleClassName}
                  style={{ ...sideHandleStyle, background: "var(--primary)" }}
                />
              </div>
            );
          })}
        </div>
      )}

      {isResumeNode && (
        <div className="border-t border-border bg-background flex flex-col">
          <div className="relative p-2 text-[10px] font-bold text-center border-b border-border text-primary">
            <span>Continue Last Interaction</span>
            <Handle
              type="source"
              position={Position.Right}
              id="continue"
              className={sideHandleClassName}
              style={{ ...sideHandleStyle, background: "var(--primary)" }}
            />
          </div>
          <div className="relative p-2 text-[10px] font-bold text-center text-foreground">
            <span>Restart Flow</span>
            <Handle
              type="source"
              position={Position.Right}
              id="restart"
              className={sideHandleClassName}
              style={{ ...sideHandleStyle, background: "var(--foreground)" }}
            />
          </div>
        </div>
      )}

      {isConditionNode && (
        <div className="border-t border-border bg-background flex flex-col">
          <div className="relative p-2 text-[10px] font-bold text-center border-b border-border text-primary">
            <span>True</span>
            <Handle
              type="source"
              position={Position.Right}
              id="true"
              className={sideHandleClassName}
              style={{ ...sideHandleStyle, background: "var(--primary)" }}
            />
          </div>
          <div className="relative p-2 text-[10px] font-bold text-center text-muted">
            <span>False</span>
            <Handle
              type="source"
              position={Position.Right}
              id="false"
              className={sideHandleClassName}
              style={{ ...sideHandleStyle, background: "var(--muted)" }}
            />
          </div>
        </div>
      )}

      {isApiNode && (
        <div className="border-t border-border bg-background flex flex-col">
          <div className="relative p-2 text-[10px] font-bold text-center border-b border-border text-primary">
            <span>On Success</span>
            <Handle
              type="source"
              position={Position.Right}
              id="success"
              className={sideHandleClassName}
              style={{ ...sideHandleStyle, background: "var(--primary)" }}
            />
          </div>
          <div className="relative p-2 text-[10px] font-bold text-center text-muted">
            <span>On Error</span>
            <Handle
              type="source"
              position={Position.Right}
              id="error"
              className={sideHandleClassName}
              style={{ ...sideHandleStyle, background: "var(--muted)" }}
            />
          </div>
        </div>
      )}

      {isWaitingNode && (
        <div className="border-t border-border bg-background flex flex-col">
          {isInputNode && (
            <div className="relative p-2 text-[10px] font-bold text-center border-b border-border text-primary">
              <span>On Response</span>
              <Handle
                type="source"
                position={Position.Right}
                id="response"
                className={sideHandleClassName}
                style={{ ...sideHandleStyle, background: "var(--primary)" }}
              />
            </div>
          )}
          <div className="relative p-2 text-[10px] font-bold text-center text-muted">
            <span>On Timeout</span>
            <Handle
              type="source"
              position={Position.Right}
              id="timeout"
              className={sideHandleClassName}
              style={{ ...sideHandleStyle, background: "var(--muted)" }}
            />
          </div>
        </div>
      )}

      {!isEndNode &&
      !isGotoNode &&
      !isInputNode &&
      !isConditionNode &&
      !isResumeNode &&
      !isErrorHandler &&
      !isApiNode &&
      maxItems === 0 ? (
        <Handle
          type="source"
          position={Position.Right}
          className={handleClassName}
          style={{ ...baseHandleStyle, background: "var(--primary)", right: handleOffset }}
        />
      ) : null}
    </div>
  );
}
