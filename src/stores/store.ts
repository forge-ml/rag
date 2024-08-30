import { DocStore, StoresClass, VectorStore } from "../types";

//@TODO: Find a better name for this file

//Stores Class
class Stores implements StoresClass {
  vectorStore: VectorStore;
  docStore: DocStore;

  constructor({
    vectorStore,
    docStore,
  }: {
    vectorStore: VectorStore;
    docStore: DocStore;
  }) {
    this.vectorStore = vectorStore;
    this.docStore = docStore;
  }
}

export default Stores;
