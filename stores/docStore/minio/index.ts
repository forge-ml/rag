import { Client } from "minio";
import {
  Chunk,
  DocStore,
  DocumentClass,
  RelevantChunk,
  ScoredEmbedding,
} from "../../../types";

class MinioDocStore implements DocStore {
  client: Client;

  //@TODO: These should not be hardcoded or class properties - this is only because we are starting with one document for now - fix
  bucketName = "doc-store"; //@TODO make this constructor parameter
  documentName = "doc";
  private static readonly DOCUMENT_FOLDER = "documents";
  documentPath = `${MinioDocStore.DOCUMENT_FOLDER}/${this.documentName}`;
  chunksName = "chunks";
  private static readonly CHUNKS_FOLDER = "chunks";
  chunksPath = `${MinioDocStore.CHUNKS_FOLDER}/${this.chunksName}`;

  constructor(
    endpoint: string,
    port: number,
    useSSL: boolean,
    accessKey: string,
    secretKey: string
  ) {
    this.client = new Client({
      endPoint: endpoint,
      port: port,
      useSSL: useSSL,
      accessKey: accessKey,
      secretKey: secretKey,
    });
    this.initializeBucket();
  }

  private async initializeBucket(): Promise<void> {
    const bucketExists = await this.client.bucketExists(this.bucketName);
    if (!bucketExists) {
      await this.client.makeBucket(this.bucketName, "us-east-1");
      //console.log(`Bucket '${this.bucketName}' created successfully.`);
      return;
    }
    return;
  }

  async storeDocument(document: DocumentClass): Promise<void> {
    const docPath = `${document.getForgeMetadata().documentId}/${
      MinioDocStore.DOCUMENT_FOLDER
    }`;

    try {
      await this.client.putObject(
        this.bucketName,
        docPath,
        Buffer.from(document.getText())
      );
      //console.log(`Document stored with Name: ${this.documentName}`);
      return;
    } catch (error) {
      console.error("Error storing document:", error);
      throw error;
    }
  }

  async retrieveDocumentText(document: DocumentClass): Promise<string> {
    const docPath = `${document.getForgeMetadata().documentId}/${
      MinioDocStore.DOCUMENT_FOLDER
    }`;

    try {
      const document = await this.client.getObject(this.bucketName, docPath);
      return document.toString();
    } catch (error) {
      console.error("Error retrieving document:", error);
      throw error;
    }
  }

  async updateDocument(text: string, document: DocumentClass): Promise<void> {
    //@TODO: test
    const docPath = `${document.getForgeMetadata().documentId}/${
      MinioDocStore.DOCUMENT_FOLDER
    }`;

    try {
      await this.client.putObject(this.bucketName, docPath, Buffer.from(text));
    } catch (error) {
      console.error("Error updating document:", error);
      throw error;
    }
  }

  async deleteDocument(document: DocumentClass): Promise<void> {
    const docPath = `${document.getForgeMetadata().documentId}/${
      MinioDocStore.DOCUMENT_FOLDER
    }`;

    try {
      //check if document exists
      //statObject returns metadata on the document
      const documentExists = await this.client.statObject(
        this.bucketName,
        docPath
      );
      if (!documentExists) {
        throw new Error(`Document "${docPath}" does not exist.`);
      }
      await this.client.removeObject(this.bucketName, docPath);
    } catch (error) {
      console.error("Error deleting document:", error);
      throw error;
    }
  }

  //Chunks methods
  async storeChunks(chunks: Chunk[], document: DocumentClass): Promise<void> {
    const chunksPath = `${document.getForgeMetadata().documentId}/${
      MinioDocStore.CHUNKS_FOLDER
    }`;

    try {
      await this.client.putObject(
        this.bucketName,
        chunksPath,
        Buffer.from(JSON.stringify(chunks))
      );
      //console.log(`Chunks stored with Name: ${this.chunksName}`);
    } catch (error) {
      console.error("Error storing chunks:", error);
      throw error;
    }
  }

  //@QUESTION: should we pass in the document or just use the document id?
  async retrieveChunks(document: DocumentClass): Promise<Chunk[]> {
    const chunksPath = `${document.getForgeMetadata().documentId}/${
      MinioDocStore.CHUNKS_FOLDER
    }`;

    const bucketExists = await this.client.bucketExists(this.bucketName);
    if (!bucketExists) {
      throw new Error(`Bucket "${this.bucketName}" does not exist.`);
    }

    const chunks = await this.client.getObject(this.bucketName, chunksPath);

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
    embeddings: ScoredEmbedding[],
    document: DocumentClass
  ): Promise<RelevantChunk[]> {
    const chunks: Chunk[] = await this.retrieveChunks(document);

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
