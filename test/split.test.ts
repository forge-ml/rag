import chunkText from '../simple/split';
import { ChunkingStrategy } from '../types';
import { expect, describe, it} from "vitest"

describe('chunkText function', () => {
  const sampleDocument = `
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula.

Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula eu tempor congue, eros est euismod turpis, id tincidunt sapien risus a quam. Maecenas fermentum consequat mi. Donec fermentum. Pellentesque malesuada nulla a mi. Duis sapien sem, aliquet nec, commodo eget, consequat quis, neque.
  `.trim();

  it.skip('should chunk text by paragraph with default options', () => {
    const chunks = chunkText(sampleDocument);
    expect(chunks).to.be.an('array');
    expect(chunks.length).to.equal(4);
    chunks.forEach(chunk => {
      expect(chunk).to.have.property('forgeMetadata');
      expect(chunk).to.have.property('metadata');
      expect(chunk).to.have.property('text');
      expect(chunk.forgeMetadata).to.have.property('documentId');
      expect(chunk.forgeMetadata).to.have.property('chunkId');
    });
  });

  it.skip('should chunk text by sentence', () => {
    const chunks = chunkText(sampleDocument, { strategy: ChunkingStrategy.BY_SENTENCE });
    expect(chunks).to.be.an('array');
    expect(chunks.length).to.be.greaterThan(4);
    chunks.forEach(chunk => {
      expect(chunk.text).to.not.include('\n\n');
    });
  });

  it.skip('should respect custom chunk size', () => {
    const chunkSize = 200;
    const chunks = chunkText(sampleDocument, { chunkSize });
    chunks.forEach(chunk => {
      expect(chunk.text.length).to.be.at.most(chunkSize);
    });
  });

  it('should have overlap between chunks', () => {
    const chunks = chunkText(sampleDocument, { chunkSize: 300, chunkOverlap: 50 });
    for (let i = 1; i < chunks.length; i++) {
      const prevChunkEnd = chunks[i - 1].text.slice(-50);
      const currentChunkStart = chunks[i].text.slice(0, 50);
      console.log(chunks)
      expect(prevChunkEnd).to.include(currentChunkStart);
    }
  });
});

