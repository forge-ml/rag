import chunkText from '../split';
import { ChunkingStrategy, DocumentClass } from '../../types';
import { expect, describe, test } from 'vitest';

class MockDocument implements DocumentClass {
  private text: string;
  private id: string;

  constructor(text: string, id: string) {
    this.text = text;
    this.id = id;
  }

  getUserMetadata: () => Record<string, any>;

  getText(): string {
    return this.text;
  }

  getForgeMetadata() {
    return { documentId: this.id };
  }
}

describe('chunkText', () => {
  const testId = 'test-doc-id';

  test('BY_PARAGRAPH strategy', () => {
    const doc = new MockDocument('Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.', testId);
    const chunks = chunkText(doc, { strategy: ChunkingStrategy.BY_PARAGRAPH });
    
    expect(chunks).toHaveLength(3);
    expect(chunks[0].text).toBe('Paragraph 1.');
    expect(chunks[1].text).toBe('Paragraph 2.');
    expect(chunks[2].text).toBe('Paragraph 3.');
  });

  test('BY_SENTENCE strategy', () => {
    const doc = new MockDocument('Sentence 1. Sentence 2! Sentence 3?', testId);
    const chunks = chunkText(doc, { strategy: ChunkingStrategy.BY_SENTENCE });
    
    expect(chunks).toHaveLength(3);
    expect(chunks[0].text).toBe('Sentence 1');
    expect(chunks[1].text).toBe('Sentence 2');
    expect(chunks[2].text).toBe('Sentence 3');
  });

  test('BY_ITEM_IN_LIST strategy', () => {
    const doc = new MockDocument('- Item 1\n- Item 2\n• Item 3', testId);
    const chunks = chunkText(doc, { strategy: ChunkingStrategy.BY_ITEM_IN_LIST });
    
    expect(chunks).toHaveLength(3);
    expect(chunks[0].text).toBe('Item 1');
    expect(chunks[1].text).toBe('Item 2');
    expect(chunks[2].text).toBe('Item 3');
  });

  test('BY_CUSTOM_DELIMITER strategy', () => {
    const doc = new MockDocument('Part 1,Part 2,Part 3', testId);
    const chunks = chunkText(doc, { 
      strategy: ChunkingStrategy.BY_CUSTOM_DELIMITER,
      delimiter: ','
    });
    
    expect(chunks).toHaveLength(3);
    expect(chunks[0].text).toBe('Part 1');
    expect(chunks[1].text).toBe('Part 2');
    expect(chunks[2].text).toBe('Part 3');
  });

  test('BY_WORD_COUNT strategy', () => {
    const doc = new MockDocument('One two three four five six seven eight nine ten', testId);
    const chunks = chunkText(doc, { 
      strategy: ChunkingStrategy.BY_WORD_COUNT,
      wordCount: 3
    });
    
    expect(chunks).toHaveLength(4);
    expect(chunks[0].text).toBe('One two three');
    expect(chunks[1].text).toBe('four five six');
    expect(chunks[2].text).toBe('seven eight nine');
    expect(chunks[3].text).toBe('ten');
  });

  test('Default strategy (BY_PARAGRAPH)', () => {
    const doc = new MockDocument('Paragraph 1.\n\nParagraph 2.', testId);
    const chunks = chunkText(doc);
    
    expect(chunks).toHaveLength(2);
    expect(chunks[0].text).toBe('Paragraph 1.');
    expect(chunks[1].text).toBe('Paragraph 2.');
  });

  test('Chunk size and overlap', () => {
    const doc = new MockDocument('A'.repeat(1500), testId);
    const chunks = chunkText(doc, {
      chunkSize: 1000,
      chunkOverlap: 200
    });
    
    expect(chunks).toHaveLength(2);
    expect(chunks[0].text.length).toBe(1000);
    expect(chunks[1].text.length).toBe(700);
    expect(chunks[1].text.startsWith('A'.repeat(200))).toBe(true);
  });

  test('Chunk and document IDs', () => {
    const doc = new MockDocument('Test 1. Test 2.', testId);
    const chunks = chunkText(doc, { strategy: ChunkingStrategy.BY_SENTENCE });
    
    expect(chunks).toHaveLength(2);
    expect(chunks[0].id).toBe(`${testId}-0`);
    expect(chunks[1].id).toBe(`${testId}-1`);
    expect(chunks[0].forgeMetadata.documentId).toBe(testId);
    expect(chunks[1].forgeMetadata.documentId).toBe(testId);
  });
});