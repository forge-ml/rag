import { Embedding, ScoredEmbedding, VectorStore } from "../../../types";
import { TurbopufferClient } from "./client";
import { Vector, Filters } from "@turbopuffer/turbopuffer";

class TurbopufferVectorStore implements VectorStore {
	public client: TurbopufferClient;

	constructor({ apiKey, namespace }: { apiKey: string, namespace: string }) {
		this.client = new TurbopufferClient({ apiKey, namespaceId: namespace });
	}

	async createIndex() {
		// Turbopuffer doesn't require explicit index creation
		// The namespace is created on first use
	}

	async addEmbedding(embedding: Embedding) {
		await this.client.upsert({
			vectors: [this.createVector(embedding)],
			distance_metric: "cosine_distance",
		});
	}

	async storeEmbeddings(embeddings: Embedding[]) {
		const vectors = embeddings.map(this.createVector);
		console.log("vectors", vectors);
		await this.client.upsert({
			vectors: vectors,
			distance_metric: "cosine_distance",
		});
	}

	async queryEmbeddings(params: {
		query: number[];
		k: number;
		documentIds?: string[];
	}): Promise<ScoredEmbedding[]> {
		let filters: Filters | undefined = undefined;
		if (params.documentIds && params.documentIds.length > 0) {
			filters = ["Or", params.documentIds.map(id => ["documentId", "Eq", id])];
		}
		const results = await this.client.query({
			vector: params.query,
			top_k: params.k,
			distance_metric: "cosine_distance",
			filters: filters,
			include_attributes: ["documentId"],
			include_vectors: false,
		});
		return results.map(match => ({
			chunkId: match.id.toString(),
			documentId: match.attributes?.documentId?.toString() ?? "",
			score: 1 - (match.dist ?? 0), // Convert distance to similarity score
		}));
	}

	private createVector(embedding: Embedding): Vector {
		return {
			id: embedding.chunkId,
			vector: embedding.embedding,
			attributes: {
				documentId: embedding.documentId,
			},
		};
	}
}

export default TurbopufferVectorStore;
