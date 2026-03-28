import { leadFormService, type LeadFormRecord } from "./leadFormService";

export async function listFlowLeadForms(workspaceId?: string, projectId?: string) {
  if (!workspaceId) {
    return [] as LeadFormRecord[];
  }

  return leadFormService.list(workspaceId, projectId);
}
