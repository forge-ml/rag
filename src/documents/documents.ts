import { DocumentClass, Metadata } from "../types";
import { generateUUID } from "../utils/generateID";

class Document implements DocumentClass {
  forgeMetadata: Metadata; // forge metadata: documentId, page?
  metadata: Record<string, any>; //user metadata
  text: string;

  //@QUESTION: should the user be given the option to set their own doc id
  constructor(text: string, metadata?: Record<string, any>, forgeMetadata?: Metadata) {
    this.forgeMetadata = forgeMetadata || {
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
