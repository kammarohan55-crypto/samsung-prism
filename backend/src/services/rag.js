import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, basename, extname } from 'path';
import { generateEmbeddings, generateEmbedding } from './gemini.js';
import { newId, run, getAll, getOne, saveDb } from '../db/db.js';

const CHUNK_SIZE = 1500;   // characters (~375 tokens)
const CHUNK_OVERLAP = 200; // characters overlap

// Simple in-memory vector store with JSON persistence
let vectorStore = [];
let vectorStorePath = null;

/**
 * Initialize vector store from disk.
 */
export function initVectorStore(basePath) {
  vectorStorePath = join(basePath, 'vectors.json');
  mkdirSync(basePath, { recursive: true });
  if (existsSync(vectorStorePath)) {
    try {
      vectorStore = JSON.parse(readFileSync(vectorStorePath, 'utf-8'));
      console.log(`[rag] Loaded ${vectorStore.length} vectors from disk`);
    } catch {
      vectorStore = [];
    }
  }
}

/**
 * Save vector store to disk.
 */
function saveVectorStore() {
  if (vectorStorePath) {
    writeFileSync(vectorStorePath, JSON.stringify(vectorStore));
  }
}

/**
 * Split text into overlapping chunks, preserving paragraph boundaries.
 */
export function chunkText(text, filename) {
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  let current = '';
  let sectionTitle = '';

  for (const para of paragraphs) {
    // Track section headers
    const headerMatch = para.match(/^#{1,3}\s+(.+)/);
    if (headerMatch) {
      sectionTitle = headerMatch[1];
    }

    if (current.length + para.length > CHUNK_SIZE && current.length > 0) {
      chunks.push({
        text: current.trim(),
        metadata: { filename, section: sectionTitle, chunk_index: chunks.length }
      });
      // Keep overlap from end of current chunk
      const overlapStart = Math.max(0, current.length - CHUNK_OVERLAP);
      current = current.slice(overlapStart) + '\n\n' + para;
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }

  if (current.trim()) {
    chunks.push({
      text: current.trim(),
      metadata: { filename, section: sectionTitle, chunk_index: chunks.length }
    });
  }

  return chunks;
}

/**
 * Ingest all markdown files from a directory.
 * @param {string} docsDir - Path to docs directory
 * @param {string} tenantId - Tenant ID
 */
export async function ingestDocuments(docsDir, tenantId) {
  if (!existsSync(docsDir)) {
    console.log('[rag] Docs directory not found:', docsDir);
    return { ingested: 0 };
  }

  const files = readdirSync(docsDir).filter(f => ['.md', '.txt'].includes(extname(f).toLowerCase()));
  let totalChunks = 0;

  for (const file of files) {
    const filepath = join(docsDir, file);
    const content = readFileSync(filepath, 'utf-8');
    const filename = basename(file);

    // Check if already ingested
    const existing = getOne('SELECT id FROM documents WHERE tenant_id = ? AND filename = ?', tenantId, filename);
    if (existing) {
      console.log(`[rag] Skipping ${filename} — already ingested`);
      continue;
    }

    console.log(`[rag] Ingesting ${filename}...`);

    // Register document
    const docId = newId();
    run(
      `INSERT INTO documents (id, tenant_id, filename, title, doc_type, source_path, status)
       VALUES (?, ?, ?, ?, 'policy', ?, 'processing')`,
      docId, tenantId, filename, filename.replace(/\.[^.]+$/, '').replace(/-/g, ' '), filepath
    );

    // Chunk
    const chunks = chunkText(content, filename);
    console.log(`[rag]   → ${chunks.length} chunks`);

    // Embed
    const texts = chunks.map(c => c.text);
    const embeddings = await generateEmbeddings(texts);

    // Store vectors
    for (let i = 0; i < chunks.length; i++) {
      vectorStore.push({
        id: newId(),
        doc_id: docId,
        tenant_id: tenantId,
        text: chunks[i].text,
        metadata: chunks[i].metadata,
        embedding: embeddings[i],
      });
    }

    // Update document status
    run(
      "UPDATE documents SET status = 'indexed', chunk_count = ?, updated_at = datetime('now') WHERE id = ?",
      chunks.length, docId
    );
    totalChunks += chunks.length;
  }

  saveVectorStore();
  saveDb();
  console.log(`[rag] Ingestion complete: ${files.length} files, ${totalChunks} chunks`);
  return { ingested: files.length, chunks: totalChunks };
}

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Retrieve the most relevant chunks for a query.
 * @param {string} query - User's question
 * @param {string} tenantId - Tenant scope
 * @param {number} topK - Number of results
 * @param {number} threshold - Minimum similarity
 * @returns {Array} Retrieved chunks with scores
 */
export async function retrieveChunks(query, tenantId, topK = 5, threshold = 0.3) {
  if (vectorStore.length === 0) {
    return [];
  }

  const queryEmbedding = await generateEmbedding(query);

  const scored = vectorStore
    .filter(v => v.tenant_id === tenantId)
    .map(v => ({
      ...v,
      score: cosineSimilarity(queryEmbedding, v.embedding),
    }))
    .filter(v => v.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

/**
 * Generate a RAG-grounded answer with citations.
 */
export async function ragAnswer(query, tenantId) {
  const chunks = await retrieveChunks(query, tenantId);

  if (chunks.length === 0) {
    return {
      answer: "I don't have enough information in our company documents to answer that accurately. Please check with HR or your manager.",
      citations: [],
      chunks_used: 0,
    };
  }

  const context = chunks.map((c, i) =>
    `[Source ${i + 1}: ${c.metadata.filename}, Section: ${c.metadata.section || 'General'}]\n${c.text}`
  ).join('\n\n---\n\n');

  const { generateResponse } = await import('./gemini.js');
  const systemPrompt = `You are an onboarding assistant for Acme Corp. Answer the user's question using ONLY the provided context. 

Rules:
- Use ONLY information from the provided context
- For every factual statement, include a citation like [Source: filename, Section]
- If the context doesn't contain the answer, say "I don't have enough information in our documents"
- Be helpful, concise, and professional
- Use bullet points and formatting for readability
- Never invent policies or information

Context:
${context}`;

  const answer = await generateResponse(systemPrompt, query);

  const citations = chunks.map(c => ({
    source: c.metadata.filename,
    section: c.metadata.section || 'General',
    score: Math.round(c.score * 100) / 100,
  }));

  return { answer, citations, chunks_used: chunks.length };
}
