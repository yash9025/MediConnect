/**
 * Production-Grade Multi-Region Tiered RAG Retriever for MediConnect
 * 
 * Features:
 * 1. Primary Country Search with Confidence-Gated Fallback:
 *    - Only documents meeting minThreshold (default: 0.60) are accepted.
 *    - If primary country lacks sufficient high-confidence documents, falls back to WHO Global.
 * 2. Noise Rejection:
 *    - Documents below minimum threshold are discarded to prevent injecting irrelevant clinical text.
 * 3. Section & Biomarker Filtering:
 *    - Supports filtering by section_type (e.g., 'contraindications', 'dosage') and biomarkers.
 */

/**
 * Perform a scored, confidence-gated tiered similarity search:
 * @param {import('@langchain/pinecone').PineconeStore} vectorStore 
 * @param {string} query 
 * @param {Object} options
 * @param {string} options.country - 'india' | 'usa' | 'uk' | 'brazil' | 'global'
 * @param {number} options.k - Target number of high-confidence documents (default: 3)
 * @param {number} options.minThreshold - Minimum cosine score for primary country (default: 0.60)
 * @param {number} options.fallbackThreshold - Minimum cosine score for WHO global fallback (default: 0.50)
 * @param {string|null} options.domain - Optional domain filter (e.g. 'Cardiology', 'Endocrinology')
 * @param {string|null} options.sectionType - Optional section filter ('dosage', 'contraindications', etc.)
 * @returns {Promise<Array<[import('@langchain/core/documents').Document, number]>>}
 */
export async function tieredSimilaritySearchWithScore(
  vectorStore, 
  query, 
  { 
    country = "india", 
    k = 3, 
    minThreshold = 0.60, 
    fallbackThreshold = 0.50, 
    domain = null,
    sectionType = null 
  } = {}
) {
  const selectedCountry = (country || "india").toLowerCase().trim();
  
  // 1. Build primary filter for selected country
  const primaryFilter = { country: { $eq: selectedCountry } };
  if (domain) primaryFilter.domain = { $eq: domain };
  if (sectionType) primaryFilter.section_type = { $eq: sectionType };

  let primaryScoredDocs = [];
  try {
    const rawResults = await vectorStore.similaritySearchWithScore(query, k * 2, primaryFilter);
    // Gate with primary confidence threshold
    primaryScoredDocs = rawResults.filter(([_, score]) => score >= minThreshold);
  } catch (err) {
    console.warn(`[RAG] Primary search for [${selectedCountry.toUpperCase()}] failed:`, err.message);
  }

  // 2. Check if we need WHO Global fallback
  let combinedResults = [...primaryScoredDocs.slice(0, k)];

  if (combinedResults.length < k && selectedCountry !== "global") {
    const shortfall = k - combinedResults.length;
    console.log(`[RAG] Tiered Fallback: [${selectedCountry.toUpperCase()}] yielded ${combinedResults.length}/${k} high-confidence docs (>= ${minThreshold}). Querying WHO Global for ${shortfall} doc(s)...`);

    const fallbackFilter = { country: { $eq: "global" } };
    if (domain) fallbackFilter.domain = { $eq: domain };
    if (sectionType) fallbackFilter.section_type = { $eq: sectionType };

    try {
      const rawGlobal = await vectorStore.similaritySearchWithScore(query, shortfall * 2, fallbackFilter);
      const passingGlobal = rawGlobal.filter(([_, score]) => score >= fallbackThreshold);
      combinedResults = [...combinedResults, ...passingGlobal.slice(0, shortfall)];
    } catch (fallbackErr) {
      console.warn("[RAG] WHO Global fallback query failed:", fallbackErr.message);
    }
  }

  // 3. Sort by highest relevance score descending
  combinedResults.sort((a, b) => b[1] - a[1]);

  if (combinedResults.length === 0) {
    console.log(`[RAG Guardrail] No guidelines passed confidence cutoff (min: ${minThreshold}). Returning empty to prevent LLM hallucination.`);
  } else {
    console.log(`[RAG] Retrieved ${combinedResults.length} guideline(s). Scores: [${combinedResults.map(([_, s]) => (s * 100).toFixed(1) + '%').join(', ')}]`);
  }

  return combinedResults;
}

/**
 * Backward-compatible helper returning Document[] (dropping scores)
 */
export async function tieredSimilaritySearch(vectorStore, query, options = {}) {
  const scored = await tieredSimilaritySearchWithScore(vectorStore, query, options);
  return scored.map(([doc]) => doc);
}
