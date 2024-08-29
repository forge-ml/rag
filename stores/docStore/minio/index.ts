import { Client } from "minio";
import {
  Chunk,
  DocStore,
  RelevantChunk,
  ScoredEmbedding,
} from "../../../types";

class MinioDocStore implements DocStore {
  client: Client;

  //@TODO: These should not be hardcoded or class properties - this is only because we are starting with one document for now - fix
  bucketName = "doc-store";
  documentName = "doc";
  documentFolder = "documents";
  documentPath = `${this.documentFolder}/${this.documentName}`;
  chunksName = "chunks";
  chunksFolder = "chunks";
  chunksPath = `${this.chunksFolder}/${this.chunksName}`;

  constructor() {
    this.client = new Client({
      endPoint: "localhost",
      port: 9000,
      useSSL: false,
      accessKey: "minioadmin",
      secretKey: "minioadmin",
    });
    this.initializeBucket();
  }

  //@QUESTION: I want to check if the bucket exists and if it doesn't, create it from the constructor but I cant do it in the constructor because constructors can't be async. Is this the correct way to do this
  private async initializeBucket(): Promise<void> {
    const bucketExists = await this.client.bucketExists(this.bucketName);
    if (!bucketExists) {
      await this.client.makeBucket(this.bucketName, "us-east-1");
      //console.log(`Bucket '${this.bucketName}' created successfully.`);
      return;
    }
    return;
  }

  async storeDocument(text: string): Promise<void> {
    try {
      await this.client.putObject(
        this.bucketName,
        this.documentPath,
        Buffer.from(text)
      );
      //console.log(`Document stored with Name: ${this.documentName}`);
      return;
    } catch (error) {
      console.error("Error storing document:", error);
      throw error;
    }
  }

  async retrieveDocument(): Promise<string> {
    const document = await this.client.getObject(
      this.bucketName,
      this.documentPath
    );
    return document.toString();
  }

  async updateDocument(text: string): Promise<void> {
    //@TODO: Implement this
    throw new Error("Not implemented");
  }

  async deleteDocument(): Promise<void> {
    //@TODO: Implement this
    throw new Error("Not implemented");
  }

  //Chunks methods
  async storeChunks(chunks: Chunk[]): Promise<void> {
    try {
      await this.client.putObject(
        this.bucketName,
        this.chunksPath,
        Buffer.from(JSON.stringify(chunks))
      );
      //console.log(`Chunks stored with Name: ${this.chunksName}`);
    } catch (error) {
      console.error("Error storing chunks:", error);
      throw error;
    }
  }

  async retrieveChunks(): Promise<Chunk[]> {
    const bucketExists = await this.client.bucketExists(this.bucketName);
    if (!bucketExists) {
      throw new Error(`Bucket "${this.bucketName}" does not exist.`);
    }

    const chunks = await this.client.getObject(
      this.bucketName,
      this.chunksPath
    );

    const chunksString = await this.streamToString(chunks);
    const chunksObject: Chunk[] = JSON.parse(chunksString);

    if (!chunksObject) {
      throw new Error(`No chunks found in bucket "${this.bucketName}"`);
    }

    return chunksObject;
  }

  async updateChunks(chunks: Chunk[]): Promise<void> {
    //@TODO: Implement this
    throw new Error("Not implemented");
  }

  async deleteChunks(): Promise<void> {
    //@TODO: Implement this
    throw new Error("Not implemented");
  }

  async queryFromEmbeddings(
    embeddings: ScoredEmbedding[]
  ): Promise<RelevantChunk[]> {
    const chunks: Chunk[] = await this.retrieveChunks();

    const relevantChunks = embeddings.map((embedding) => {
      return {
        ...embedding,
        text: chunks.find((c) => c.id === embedding.chunkId)?.text || "",
      };
    });

    return relevantChunks;
  }

  async deleteBucket(): Promise<void> {
    await this.client.removeBucket(this.bucketName);
  }

  //helper
  private async streamToString(stream: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: any[] = [];
      stream.on("data", (chunk: any) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
  }
}

export default MinioDocStore;
