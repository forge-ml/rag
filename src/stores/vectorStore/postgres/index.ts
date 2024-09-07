
import { Embedding, VectorStore } from "../../../types";
import { Pool } from 'pg';
import { VECTOR_MODEL_DIM } from "../types";

const defaultCreateIndexOpts = {
  dim: VECTOR_MODEL_DIM.NOMIC_V1_5,
}

class PostgresVectorStore implements VectorStore {
  public pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
    });
  }

  async createIndex(opts = defaultCreateIndexOpts) {
    const client = await this.pool.connect();
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector');
      await client.query(`
        CREATE TABLE IF NOT EXISTS embeddings (
          id SERIAL PRIMARY KEY,
          chunk_id TEXT NOT NULL,
          document_id TEXT NOT NULL,
          embedding vector(${opts.dim})
        )
      `);
      await client.query('CREATE INDEX IF NOT EXISTS embedding_idx ON embeddings USING ivfflat (embedding vector_cosine_ops)');
    } catch (error) {
      console.error('Error creating index:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async addEmbedding(embedding: Embedding) {
    const client = await this.pool.connect();
    try {
      const embeddingArray = `[${embedding.embedding.join(',')}]`;
      await client.query(
        'INSERT INTO embeddings (chunk_id, document_id, embedding) VALUES ($1, $2, $3::vector)',
        [embedding.chunkId, embedding.documentId, embeddingArray]
      );
    } catch (error) {
      console.error('Error adding embedding:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async storeEmbeddings(embeddings: Embedding[]) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const embedding of embeddings) {
        await this.addEmbedding(embedding);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error storing embeddings:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async queryEmbeddings(params: {
    query: number[];
    k: number;
    documentIds?: string[];
  }) {
    const client = await this.pool.connect();
    try {
      const queryVector = `[${params.query.join(',')}]`;
      let queryString = `
        SELECT chunk_id, document_id, 1 - (embedding <=> $1::vector) AS score
        FROM embeddings
      `;

      const queryParams: any[] = [queryVector];

      if (params.documentIds && params.documentIds.length > 0) {
        queryString += ' WHERE document_id = ANY($2)';
        queryParams.push(params.documentIds);
      }

      queryString += `
        ORDER BY score DESC
        LIMIT $${queryParams.length + 1}
      `;
      queryParams.push(params.k);

      const result = await client.query(queryString, queryParams);

      return result.rows.map(row => ({
        chunkId: row.chunk_id,
        documentId: row.document_id,
        score: row.score,
      }));
    } catch (error) {
      console.error('Error querying embeddings:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

export default PostgresVectorStore;
