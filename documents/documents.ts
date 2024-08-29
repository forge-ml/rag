import { DocumentClass, Metadata } from "../types";

class Document implements DocumentClass {
  forgeMetadata: Metadata; // forge metadata: documentId, page?
  metadata: Record<string, any>; //user metadata
  text: string;
  constructor(text: string, metadata?: Record<string, any>) {
    this.forgeMetadata = {
      documentId: Date.now().toString(),
    };
    this.metadata = metadata || {};
    this.text = text;
  }

  getMetadata(): Metadata {
    return this.forgeMetadata;
  }
  getText(): string {
    return this.text;
  }
}

export default Document;
