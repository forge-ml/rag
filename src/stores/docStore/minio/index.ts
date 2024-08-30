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
  private static readonly DOCUMENT_FILE = "documents";
  chunksName = "chunks";
  private static readonly CHUNKS_FILE = "chunks";

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

  async storeDocument(document: DocumentClass, chunks: Chunk[]): Promise<void> {
    const docPath = `${document.getForgeMetadata().documentId}/${
      MinioDocStore.DOCUMENT_FILE
    }`;

    const chunksPath = `${document.getForgeMetadata().documentId}/${
      MinioDocStore.CHUNKS_FILE
    }`;

    try {
      await Promise.all([
        this.client.putObject(
          this.bucketName,
          docPath,
          Buffer.from(JSON.stringify(document))
        ),
        this.client.putObject(
          this.bucketName,
          chunksPath,
          Buffer.from(JSON.stringify(chunks))
        ),
      ]);
      //console.log(`Document stored with Name: ${this.documentName}`);
      return;
    } catch (error) {
      console.error("Error storing document:", error);
      throw error;
    }
  }

  async retrieveDocument(documentId: string): Promise<DocumentClass> {
    const docPath = `${documentId}/${MinioDocStore.DOCUMENT_FILE}`;

    try {
      const document = await this.client.getObject(this.bucketName, docPath);
      const documentString = await this.streamToString(document);
      const documentObject: DocumentClass = JSON.parse(documentString);
      return documentObject;
    } catch (error) {
      console.error("Error retrieving document:", error);
      throw error;
    }
  }

  //@TODO: fix - this is broken
  async updateDocument(
    document: DocumentClass,
    documentId: string
  ): Promise<void> {
    const docPath = `${documentId}/${MinioDocStore.DOCUMENT_FILE}`;
    //@TODO fix - this is broken
    try {
      // Check if the document exists before updating
      const exists = await this.client
        .statObject(this.bucketName, docPath)
        .catch(() => false);
      if (!exists) {
        throw new Error(`Document with ID ${documentId} does not exist.`);
      }

      // Proceed with update
      await this.client.putObject(
        this.bucketName,
        docPath,
        Buffer.from(JSON.stringify(document))
      );
    } catch (error) {
      console.error("Error updating document:", error);
      throw error;
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    const docPath = `${documentId}/${MinioDocStore.DOCUMENT_FILE}`;

    try {
      //check if document exists
      //statObject returns metadata on the document
      const documentExists = await this.client.statObject(
        this.bucketName,
        docPath
      );

      //check if chunks exist
      const chunksPath = `${documentId}/${MinioDocStore.CHUNKS_FILE}`;
      const chunksExists = await this.client.statObject(
        this.bucketName,
        chunksPath
      );
      if (!documentExists || !chunksExists) {
        throw new Error(`Document "${docPath}" does not exist.`);
      }
      await Promise.all([
        this.client.removeObject(this.bucketName, docPath),
        this.client.removeObject(this.bucketName, chunksPath),
      ]);
    } catch (error) {
      console.error("Error deleting document:", error);
      throw error;
    }
  }

  //@QUESTION: should we pass in the document or just use the document id?
  async retrieveChunks(document: DocumentClass): Promise<Chunk[]> {
    const chunksPath = `${document.getForgeMetadata().documentId}/${
      MinioDocStore.CHUNKS_FILE
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
