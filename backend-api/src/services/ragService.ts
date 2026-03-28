import { query as dbQuery } from "../config/db";

export type RetrievedKnowledgeChunk = {
  id: string;
  title?: string | null;
  content: string;
  score?: number | null;
  metadata?: Record<string, unknown> | null;
};

export async function retrieveKnowledgeForWorkspace(_input: {
  workspaceId?: string | null;
  projectId?: string | null;
  query: string;
  limit?: number;
  embedding?: number[] | null;
}): Promise<RetrievedKnowledgeChunk[]> {
  const workspaceId = _input.workspaceId?.trim();
  const projectId = _input.projectId?.trim();
  const searchQuery = _input.query.trim();
  const limit = Math.max(1, Math.min(_input.limit ?? 5, 20));

  if (!workspaceId || !searchQuery) {
    return [];
  }

  const vectorLiteral = serializeVector(_input.embedding);

  if (vectorLiteral) {
    try {
      const vectorResults = (await dbQuery(
        `
          SELECT
            id,
            title,
            content,
            metadata,
            CASE
              WHEN embedding IS NULL THEN NULL
              ELSE 1 - (embedding <=> $4::vector)
            END AS score
          FROM document_embeddings
          WHERE workspace_id = $1
            AND ($2::uuid IS NULL OR project_id = $2 OR project_id IS NULL)
            AND (
              embedding IS NOT NULL
              OR title ILIKE $3
              OR content ILIKE $3
            )
          ORDER BY
            CASE WHEN embedding IS NULL THEN 1 ELSE 0 END,
            embedding <=> $4::vector NULLS LAST,
            updated_at DESC
          LIMIT $5
        `,
        [workspaceId, projectId ?? null, buildLikePattern(searchQuery), vectorLiteral, limit],
      )) as {
        rows: Array<{
          id: string;
          title: string | null;
          content: string;
          metadata: Record<string, unknown> | null;
          score: number | null;
        }>;
      };

      return vectorResults.rows.map(mapRetrievedChunk);
    } catch (error) {
      const code = getPgErrorCode(error);
      if (code !== "42P01" && code !== "42703" && code !== "42883") {
        throw error;
      }
    }
  }

  try {
    const textResults = (await dbQuery(
      `
        SELECT
          id,
          title,
          content,
          metadata,
          (
            CASE WHEN title ILIKE $3 THEN 2 ELSE 0 END +
            CASE WHEN content ILIKE $3 THEN 1 ELSE 0 END
          )::float AS score
        FROM document_embeddings
        WHERE workspace_id = $1
          AND ($2::uuid IS NULL OR project_id = $2 OR project_id IS NULL)
          AND (
            title ILIKE $3
            OR content ILIKE $3
          )
        ORDER BY score DESC, updated_at DESC
        LIMIT $4
      `,
      [workspaceId, projectId ?? null, buildLikePattern(searchQuery), limit],
    )) as {
      rows: Array<{
        id: string;
        title: string | null;
        content: string;
        metadata: Record<string, unknown> | null;
        score: number | null;
      }>;
    };

    return textResults.rows.map(mapRetrievedChunk);
  } catch (error) {
    const code = getPgErrorCode(error);
    if (code === "42P01" || code === "42703" || code === "42883") {
      return [];
    }
    throw error;
  }
}

function buildLikePattern(input: string): string {
  return `%${input.replace(/[%_]/g, "\\$&")}%`;
}

function serializeVector(vector?: number[] | null): string | null {
  if (!vector?.length) {
    return null;
  }

  return `[${vector.map((value) => Number(value).toFixed(12).replace(/\.?0+$/, "")).join(",")}]`;
}

function mapRetrievedChunk(row: {
  id: string;
  title: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  score: number | null;
}): RetrievedKnowledgeChunk {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    score: row.score,
    metadata: row.metadata,
  };
}

function getPgErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}
