import { DocumentClass, Metadata } from "../types";
import { generateUUID } from "../utils/generateID";

class Document implements DocumentClass {
  forgeMetadata: Metadata; // forge metadata: documentId, page?
  metadata: Record<string, any>; //user metadata
  text: string;
  constructor(text: string, metadata?: Record<string, any>) {
    this.forgeMetadata = {
      documentId: generateUUID(),
    };
    this.metadata = metadata || {};
    this.text = text;
  }

  getForgeMetadata(): Metadata {
    return this.forgeMetadata;
  }
  getText(): string {
    return this.text;
  }
  getUserMetadata(): Record<string, any> {
    return this.metadata;
  }
}

export default Document;
