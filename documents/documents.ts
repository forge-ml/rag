import { DocumentClass, Metadata } from "../types";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
