const { Client } = require("pg");

const connectionString = process.env.DB_URL || process.env.DATABASE_URL;

function normalizeFlowJson(flowJson) {
  return flowJson && typeof flowJson === "object"
    ? {
        ...flowJson,
        nodes: Array.isArray(flowJson.nodes) ? flowJson.nodes : [],
        edges: Array.isArray(flowJson.edges) ? flowJson.edges : [],
      }
    : { nodes: [], edges: [] };
}

function stripLeadFormNodes(flowJson) {
  const normalized = normalizeFlowJson(flowJson);
  const nodes = normalized.nodes;
  const edges = normalized.edges;
  const removedNodeIds = new Set(
    nodes
      .filter((node) => String(node?.type || "").trim().toLowerCase() === "lead_form")
      .map((node) => String(node.id))
  );

  if (removedNodeIds.size === 0) {
    return { flowJson: normalized, changed: false };
  }

  const remainingNodes = nodes.filter((node) => !removedNodeIds.has(String(node.id)));
  const incomingEdges = edges.filter((edge) => removedNodeIds.has(String(edge.target)));
  const outgoingEdges = edges.filter((edge) => removedNodeIds.has(String(edge.source)));
  const preservedEdges = edges.filter(
    (edge) =>
      !removedNodeIds.has(String(edge.source)) && !removedNodeIds.has(String(edge.target))
  );

  const stitchedEdges = [];
  for (const incoming of incomingEdges) {
    for (const outgoing of outgoingEdges.filter(
      (candidate) => String(candidate.source) === String(incoming.target)
    )) {
      stitchedEdges.push({
        ...outgoing,
        id: `migrated-${incoming.id}-${outgoing.id}`,
        source: incoming.source,
        sourceHandle: incoming.sourceHandle || null,
        target: outgoing.target,
        targetHandle: outgoing.targetHandle || null,
        selected: false,
      });
    }
  }

  const dedupedEdges = [];
  const seen = new Set();
  for (const edge of [...preservedEdges, ...stitchedEdges]) {
    const key = [
      String(edge.source || ""),
      String(edge.sourceHandle || ""),
      String(edge.target || ""),
      String(edge.targetHandle || ""),
    ].join("|");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    dedupedEdges.push(edge);
  }

  return {
    flowJson: {
      ...normalized,
      nodes: remainingNodes,
      edges: dedupedEdges,
    },
    changed: true,
  };
}

async function syncFlowNodes(client, flowId, flowJson) {
  const nodes = Array.isArray(flowJson?.nodes) ? flowJson.nodes : [];
  await client.query("DELETE FROM flow_nodes WHERE flow_id = $1", [flowId]);

  for (const node of nodes) {
    await client.query(
      `INSERT INTO flow_nodes (flow_id, node_id, node_type, node_label, node_data, position_x, position_y)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
      [
        flowId,
        node.id,
        node.type,
        node.data?.label || null,
        JSON.stringify(node.data || {}),
        node.position?.x ?? null,
        node.position?.y ?? null,
      ]
    );
  }
}

async function main() {
  if (!connectionString) {
    throw new Error("DB_URL or DATABASE_URL is required");
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const res = await client.query(`SELECT id, flow_json FROM flows ORDER BY created_at ASC`);
    let changedCount = 0;

    for (const row of res.rows) {
      const { flowJson, changed } = stripLeadFormNodes(row.flow_json);
      if (!changed) {
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(
          `UPDATE flows
           SET flow_json = $2::jsonb,
               updated_at = NOW()
           WHERE id = $1`,
          [row.id, JSON.stringify(flowJson)]
        );
        await syncFlowNodes(client, row.id, flowJson);
        await client.query("COMMIT");
        changedCount += 1;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log(`Retired lead_form nodes in ${changedCount} flow(s).`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
