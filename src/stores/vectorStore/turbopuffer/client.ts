import { Vector, DistanceMetric, Schema, QueryResults, Filters } from "@turbopuffer/turbopuffer";

export class TurbopufferClient {
  private apiKey: string;
  private namespaceId: string;

  constructor({ apiKey, namespaceId }: { apiKey: string, namespaceId: string }) {
    this.apiKey = apiKey;
    this.namespaceId = namespaceId;
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'DELETE',
    endpoint: string,
    body?: object
  ): Promise<T> {
    const url = `https://api.turbopuffer.com/v1/${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      console.log(response);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  async upsert(params: {
    vectors: Vector[];
    distance_metric: DistanceMetric;
    schema?: Schema;
  }): Promise<void> {
    const { vectors, distance_metric, schema } = params;

    const upsertData = {
      ids: vectors.map(v => v.id),
      vectors: vectors.map(v => v.vector),
      attributes: this.formatAttributes(vectors),
      distance_metric,
      schema,
    };

    await this.makeRequest('POST', `vectors/${this.namespaceId}`, upsertData);
  }

  private formatAttributes(vectors: Vector[]): Record<string, any[]> {
    const attributes: Record<string, any[]> = {};

    vectors.forEach(vector => {
      if (vector.attributes) {
        Object.entries(vector.attributes).forEach(([key, value]) => {
          if (!attributes[key]) {
            attributes[key] = [];
          }
          attributes[key].push(value);
        });
      }
    });

    // Ensure all attribute arrays have the same length as the vectors array
    Object.keys(attributes).forEach(key => {
      while (attributes[key].length < vectors.length) {
        attributes[key].push(null);
      }
    });

    return attributes;
  }

  async query(params: {
    vector?: number[];
    distance_metric?: DistanceMetric;
    top_k?: number;
    include_vectors?: boolean;
    include_attributes?: boolean | string[];
    filters?: Filters;
    rank_by?: string[];
  }): Promise<QueryResults> {
    const {
      vector,
      distance_metric,
      top_k = 10,
      include_vectors = false,
      include_attributes = false,
      filters,
      rank_by,
    } = params;

    const queryData = {
      vector,
      distance_metric,
      top_k,
      include_vectors,
      include_attributes,
      filters,
      rank_by,
    };

    return this.makeRequest<QueryResults>('POST', `vectors/${this.namespaceId}/query`, queryData);
  }

  async deleteNamespace(): Promise<{ status: string }> {
    return this.makeRequest<{ status: string }>('DELETE', `vectors/${this.namespaceId}`);
  }
}
