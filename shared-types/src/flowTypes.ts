// shared-types/src/flowTypes.ts


export type FlowStatus =
  | "draft"
  | "active"
  | "archived"


export type NodeType =
  | "start"
  | "message"
  | "condition"
  | "input"
  | "api"
  | "response"
  | "handoff"
  | "end"


export interface FlowNode {
  id: string

  type: NodeType

  data: Record<string, unknown>

  position_x?: number

  position_y?: number
}


export interface FlowEdge {
  id: string

  source: string

  target: string

  label?: string
}


export interface FlowJson {
  nodes: FlowNode[]

  edges: FlowEdge[]
}


export interface Flow {
  id: string

  bot_id: string

  name: string

  flow_json: FlowJson

  version: number

  status: FlowStatus

  created_at: string

  updated_at?: string
}