import { createPlan, deactivatePlan, findPlans, updatePlan } from "../models/planModel";
import { assertPlatformRoles } from "./workspaceAccessService";

export async function listPlansService(userId: string) {
  await assertPlatformRoles(userId, ["super_admin", "developer"]);
  return findPlans();
}

function normalizePlanId(value?: string) {
  const id = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-");

  if (!id) {
    throw { status: 400, message: "Plan id is required" };
  }

  return id;
}

export async function createPlanService(userId: string, payload: Record<string, unknown>) {
  await assertPlatformRoles(userId, ["super_admin", "developer"]);

  const id = normalizePlanId(String(payload.id || payload.name || ""));
  const name = String(payload.name || "").trim();
  if (!name) {
    throw { status: 400, message: "Plan name is required" };
  }

  return createPlan({
    ...payload,
    id,
    name,
  });
}

export async function updatePlanService(
  userId: string,
  planId: string,
  payload: Record<string, unknown>
) {
  await assertPlatformRoles(userId, ["super_admin", "developer"]);
  const updated = await updatePlan(planId, payload);
  if (!updated) {
    throw { status: 404, message: "Plan not found" };
  }
  return updated;
}

export async function deletePlanService(userId: string, planId: string) {
  await assertPlatformRoles(userId, ["super_admin", "developer"]);
  const updated = await deactivatePlan(planId);
  if (!updated) {
    throw { status: 404, message: "Plan not found" };
  }
  return updated;
}
