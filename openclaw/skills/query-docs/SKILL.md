---
name: query-docs
description: Search the vector store for document chunks relevant to a user query, then compose a cited answer
---

# Query Documents Skill

## Workflow
1. Receive the user's natural language query
2. Generate an embedding for the query using the configured embedding model
3. Search the LanceDB vector store for top-k (k=5) most similar chunks
4. Filter results by similarity threshold (>= 0.7)
5. If no results pass threshold: return "I don't have enough information in our documents to answer that."
6. Compose answer using ONLY the retrieved chunk contents
7. For each factual statement, append citation: [Source: {filename}, {section}]
8. Return structured response: { answer, citations[], chunks_used[] }

## Parameters
- `query` (string, required): The user's question
- `tenant_id` (string, required): Tenant scope for document filtering
- `top_k` (integer, default: 5): Number of chunks to retrieve
- `threshold` (float, default: 0.7): Minimum similarity score

## Error Handling
- If vector store is empty: "No documents have been indexed yet. Please upload company documents first."
- If embedding API fails: "Document search is temporarily unavailable. Please try again later."
- Never fall back to generating answers from training data
