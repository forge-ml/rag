import { Client } from "minio";
import {
  Chunk,
  DocStore,
  DocumentClass,
  RelevantChunk,
  ScoredEmbedding,
} from "../../../types";
import Document from "../../../documents/documents";

const mergeDocuments = (
  existingDocument: Document,
  newDocument: Document
): Document => {
  return new Document(
    existingDocument.text + newDocument.text,
    existingDocument.metadata,
    existingDocument.forgeMetadata
  );
};

interface MinioDocStoreParams {
  endpoint: string;
  port?: number;
  useSSL?: boolean;
  accessKey: string;
  secretKey: string;
}

class MinioDocStore implements DocStore {
  client: Client;

  //@TODO: These should not be hardcoded or class properties - this is only because we are starting with one document for now - fix
  bucketName = "doc-store"; //@TODO make this constructor parameter
  documentName = "doc";
  private static readonly DOCUMENT_FILE = "documents";
  chunksName = "chunks";
  private static readonly CHUNKS_FILE = "chunks";

  constructor({
    endpoint,
    port,
    useSSL,
    accessKey,
    secretKey,
  }: MinioDocStoreParams) {
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

  async retrieveDocument(documentId: string): Promise<Document> {
    const docPath = `${documentId}/${MinioDocStore.DOCUMENT_FILE}`;

    try {
      const document = await this.client.getObject(this.bucketName, docPath);
      const documentString = JSON.parse(await this.streamToString(document));
      return new Document(
        documentString.text,
        documentString.metadata,
        documentString.forgeMetadata
      );
    } catch (error) {
      console.error("Error retrieving document:", error);
      throw error;
    }
  }

  async updateDocument(document: Document, documentId: string): Promise<void> {
    const docPath = `${documentId}/${MinioDocStore.DOCUMENT_FILE}`;
    //@TODO fix - this is broken
    try {
      // Check if the document exists before updating
      const existingDocument = await this.retrieveDocument(documentId);
      if (!existingDocument) {
        throw new Error(`Document with ID ${documentId} does not exist.`);
      }

      const updatedDocument = mergeDocuments(existingDocument, document);

      // Proceed with update
      await this.client.putObject(
        this.bucketName,
        docPath,
        Buffer.from(JSON.stringify(updatedDocument))
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

  async retrieveChunks(documentIds: string[]): Promise<Chunk[]> {
    const allChunks: Chunk[] = [];

    const bucketExists = await this.client.bucketExists(this.bucketName);
    if (!bucketExists) {
      throw new Error(`Bucket "${this.bucketName}" does not exist.`);
    }

    const chunkPromises = documentIds.map(async (documentId) => {
      // Grab the chunk path
      const chunksPath = `${documentId}/${MinioDocStore.CHUNKS_FILE}`;

      try {
        // Grab the chunks from the bucket
        const chunks = await this.client.getObject(this.bucketName, chunksPath);
        const chunksString = await this.streamToString(chunks);

        // Parse the chunks and return them
        return JSON.parse(chunksString) as Chunk[];
      } catch (error) {
        console.error(
          `Error retrieving chunks for document ${documentId}:`,
          error
        );
        return [];
      }
    });

    const chunksArrays = await Promise.all(chunkPromises);
    allChunks.push(...chunksArrays.flat());

    if (allChunks.length === 0) {
      throw new Error(
        `No chunks found for the provided document IDs in bucket "${this.bucketName}"`
      );
    }

    return allChunks;
  }

  async mergeChunksAndEmbeddings(
    embeddings: ScoredEmbedding[],
    documentIds: string[]
  ): Promise<RelevantChunk[]> {
    const chunks: Chunk[] = await this.retrieveChunks(documentIds);

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
