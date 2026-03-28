import { db } from "../config/db";

export type DocumentEmbeddingMetadata = Record<string, unknown>;

export type DocumentIngestionInput = {
  workspaceId: string;
  projectId?: string | null;
  sourceType: string;
  sourceRef?: string | null;
  title?: string | null;
  content: string;
  metadata?: DocumentEmbeddingMetadata | null;
  embedding?: number[] | null;
  chunkSize?: number;
  chunkOverlap?: number;
  replaceExisting?: boolean;
};

export type IngestedDocumentChunk = {
  id: string;
  index: number;
  content: string;
  metadata: DocumentEmbeddingMetadata;
};

export type DocumentIngestionResult = {
  sourceType: string;
  sourceRef?: string | null;
  chunkCount: number;
  chunks: IngestedDocumentChunk[];
};

const DEFAULT_CHUNK_SIZE = 900;
const DEFAULT_CHUNK_OVERLAP = 120;

function normalizeWhitespace(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function clampChunkSettings(
  chunkSize?: number,
  chunkOverlap?: number,
): { chunkSize: number; chunkOverlap: number } {
  const safeChunkSize = Number.isFinite(chunkSize) ? Math.max(250, Math.floor(chunkSize!)) : DEFAULT_CHUNK_SIZE;
  const requestedOverlap = Number.isFinite(chunkOverlap)
    ? Math.max(0, Math.floor(chunkOverlap!))
    : DEFAULT_CHUNK_OVERLAP;

  return {
    chunkSize: safeChunkSize,
    chunkOverlap: Math.min(requestedOverlap, Math.floor(safeChunkSize / 3)),
  };
}

function chunkDocument(content: string, chunkSize: number, chunkOverlap: number): string[] {
  const normalized = normalizeWhitespace(content);
  if (!normalized) {
    return [];
  }

  if (normalized.length <= chunkSize) {
    return [normalized];
  }

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    let end = Math.min(cursor + chunkSize, normalized.length);
    if (end < normalized.length) {
      const paragraphBreak = normalized.lastIndexOf("\n", end);
      const sentenceBreak = Math.max(
        normalized.lastIndexOf(". ", end),
        normalized.lastIndexOf("? ", end),
        normalized.lastIndexOf("! ", end),
      );
      const wordBreak = normalized.lastIndexOf(" ", end);
      const preferredBreak = [paragraphBreak, sentenceBreak, wordBreak].find(
        (candidate) => candidate > cursor + Math.floor(chunkSize * 0.6),
      );
      if (preferredBreak) {
        end = preferredBreak + 1;
      }
    }

    const nextChunk = normalized.slice(cursor, end).trim();
    if (nextChunk) {
      chunks.push(nextChunk);
    }

    if (end >= normalized.length) {
      break;
    }

    cursor = Math.max(end - chunkOverlap, cursor + 1);
  }

  return chunks;
}

function serializeVector(vector?: number[] | null): string | null {
  if (!vector?.length) {
    return null;
  }

  return `[${vector.map((value) => Number(value).toFixed(12).replace(/\.?0+$/, "")).join(",")}]`;
}

export async function ingestDocumentEmbeddings(
  input: DocumentIngestionInput,
): Promise<DocumentIngestionResult> {
  const { chunkSize, chunkOverlap } = clampChunkSettings(input.chunkSize, input.chunkOverlap);
  const chunks = chunkDocument(input.content, chunkSize, chunkOverlap);

  if (!chunks.length) {
    return {
      sourceType: input.sourceType,
      sourceRef: input.sourceRef ?? null,
      chunkCount: 0,
      chunks: [],
    };
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    if (input.replaceExisting !== false) {
      await client.query(
        `
          DELETE FROM document_embeddings
          WHERE workspace_id = $1
            AND source_type = $2
            AND (
              ($3::text IS NULL AND source_ref IS NULL)
              OR source_ref = $3
            )
            AND (
              ($4::uuid IS NULL AND project_id IS NULL)
              OR project_id = $4
            )
        `,
        [input.workspaceId, input.sourceType, input.sourceRef ?? null, input.projectId ?? null],
      );
    }

    const ingestedChunks: IngestedDocumentChunk[] = [];
    const vectorLiteral = serializeVector(input.embedding);
    const totalChunks = chunks.length;

    for (const [index, chunk] of chunks.entries()) {
      const metadata: DocumentEmbeddingMetadata = {
        ...(input.metadata ?? {}),
        chunkIndex: index,
        chunkCount: totalChunks,
        sourceType: input.sourceType,
      };

      const insertResult = await client.query<{
        id: string;
        content: string;
        metadata: DocumentEmbeddingMetadata;
      }>(
        `
          INSERT INTO document_embeddings (
            workspace_id,
            project_id,
            source_type,
            source_ref,
            title,
            content,
            metadata,
            embedding
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7::jsonb,
            $8::vector
          )
          RETURNING id, content, metadata
        `,
        [
          input.workspaceId,
          input.projectId ?? null,
          input.sourceType,
          input.sourceRef ?? null,
          input.title ?? null,
          chunk,
          JSON.stringify(metadata),
          vectorLiteral,
        ],
      );

      const inserted = insertResult.rows[0];
      if (inserted) {
        ingestedChunks.push({
          id: inserted.id,
          index,
          content: inserted.content,
          metadata: inserted.metadata,
        });
      }
    }

    await client.query("COMMIT");

    return {
      sourceType: input.sourceType,
      sourceRef: input.sourceRef ?? null,
      chunkCount: ingestedChunks.length,
      chunks: ingestedChunks,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
