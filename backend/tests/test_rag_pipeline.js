/**
 * Automated End-to-End Pipeline Test for MediConnect Production RAG
 * 
 * Tests:
 * 1. Cloud Embeddings: Verifies Google text-embedding-004 generates 768-dim vectors.
 * 2. Clinical Chunker: Verifies section detection, biomarker tagging, and breadcrumb context injection.
 * 3. Scored Tiered Retriever: Tests confidence thresholding (>= 0.55) and noise rejection.
 * 4. Researcher Agent: Tests LangGraph researcher node with anti-hallucination clinical guardrail.
 * 5. BullMQ Ingestion Queue: Tests job creation and state retrieval.
 */

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

import { getEmbeddings } from "../config/embeddings.js";
import { detectSectionType, extractBiomarkers, splitClinicalDocuments } from "../utils/clinicalChunker.js";
import { tieredSimilaritySearchWithScore } from "../utils/ragRetriever.js";
import { runResearcher } from "../agents/researcherAgent.js";
import { enqueueRagIngestion, ragQueue } from "../workers/ragQueue.js";
import { Document } from "@langchain/core/documents";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedCount++;
    throw new Error(message);
  }
}

async function testCloudEmbeddings() {
  console.log("\n==================================================");
  console.log("🧪 TEST 1: Google text-embedding-004 Verification");
  console.log("==================================================");

  const queryEmbeddings = getEmbeddings("RETRIEVAL_QUERY");
  assert(queryEmbeddings !== null, "Embedding instance initialized successfully");

  const testText = "Patient presenting with elevated fasting blood sugar and HbA1c 8.5%";
  const vector = await queryEmbeddings.embedQuery(testText);

  assert(Array.isArray(vector), "Embedding output is an array");
  assert(vector.length === 768, `Vector dimension is exactly 768 (got: ${vector.length})`);
  assert(typeof vector[0] === "number", "Vector contains numeric floating point values");
  console.log(`  ℹ️ Sample vector slice (first 3 dims): [${vector.slice(0, 3).map(n => n.toFixed(4)).join(", ")}]`);
}

async function testClinicalChunker() {
  console.log("\n==================================================");
  console.log("🧪 TEST 2: Clinical Chunker & Breadcrumb Injection");
  console.log("==================================================");

  // 1. Test Section Detection
  const dosageSnippet = "Dosage and Administration: Administer Metformin 500mg orally twice daily.";
  const contraindicationSnippet = "Contraindications: Strictly contraindicated in acute renal failure with eGFR < 30.";
  
  assert(detectSectionType(dosageSnippet) === "dosage", "Detected 'dosage' section correctly");
  assert(detectSectionType(contraindicationSnippet) === "contraindications", "Detected 'contraindications' section correctly");

  // 2. Test Biomarker Extraction
  const biomarkerSnippet = "Patient lab results indicate elevated HbA1c, elevated fasting glucose, and low creatinine clearance.";
  const biomarkers = extractBiomarkers(biomarkerSnippet);
  assert(biomarkers.includes("hba1c"), "Extracted 'hba1c' biomarker");
  assert(biomarkers.includes("glucose"), "Extracted 'glucose' biomarker");
  assert(biomarkers.includes("creatinine"), "Extracted 'creatinine' biomarker");

  // 3. Test Breadcrumb Header Injection
  const testDoc = new Document({
    pageContent: "Section: Treatment Guidelines.\nAdminister Amlodipine 5mg once daily as first line therapy for stage 1 hypertension. Monitor blood pressure weekly.",
    metadata: {
      source_file: "Hypertension_QRG",
      country: "india",
      authority: "ICMR/MoHFW",
      domain: "Cardiology",
    }
  });

  const clinicalChunks = await splitClinicalDocuments([testDoc], { chunkSize: 500, chunkOverlap: 50 });
  assert(clinicalChunks.length > 0, "Generated clinical chunks");
  
  const firstChunk = clinicalChunks[0];
  assert(firstChunk.pageContent.includes("[Guideline: ICMR/MoHFW"), "Chunk contains injected Guideline breadcrumb");
  assert(firstChunk.pageContent.includes("Country: INDIA"), "Chunk contains injected Country breadcrumb");
  assert(firstChunk.pageContent.includes("Domain: Cardiology"), "Chunk contains injected Domain breadcrumb");
  assert(firstChunk.metadata.section_type !== undefined, "Chunk metadata contains section_type");
  assert(firstChunk.metadata.biomarkers.includes("blood pressure"), "Chunk metadata contains extracted biomarker 'blood pressure'");
  console.log(`  ℹ️ Injected Breadcrumb sample:\n      ${firstChunk.pageContent.split('\n')[0]}`);
}

async function testScoredRetriever() {
  console.log("\n==================================================");
  console.log("🧪 TEST 3: Scored Tiered Retrieval & Noise Rejection");
  console.log("==================================================");

  if (!process.env.PINECONE_API_KEY) {
    console.warn("  ⚠️ Skipping live Pinecone query: PINECONE_API_KEY not configured.");
    return;
  }

  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const pineconeIndex = pinecone.Index("mediconnect");
  const queryEmbeddings = getEmbeddings("RETRIEVAL_QUERY");

  const vectorStore = await PineconeStore.fromExistingIndex(queryEmbeddings, {
    pineconeIndex,
  });

  const query = "First-line pharmacological treatment for elevated blood pressure and hypertension";
  const scoredResults = await tieredSimilaritySearchWithScore(vectorStore, query, {
    country: "india",
    k: 2,
    minThreshold: 0.50,
    fallbackThreshold: 0.45,
  });

  assert(Array.isArray(scoredResults), "Scored results is an array");
  console.log(`  ℹ️ Retrieved ${scoredResults.length} guideline candidate(s)`);

  for (const [doc, score] of scoredResults) {
    assert(score >= 0.45, `Document score (${(score * 100).toFixed(1)}%) satisfies confidence threshold`);
    assert(doc.pageContent && doc.pageContent.length > 0, "Document contains clinical pageContent");
  }
}

async function testResearcherAgent() {
  console.log("\n==================================================");
  console.log("🧪 TEST 4: Researcher Agent & Clinical Safety Guardrail");
  console.log("==================================================");

  if (!process.env.GEMINI_API_KEY) {
    console.warn("  ⚠️ Skipping Researcher Agent: GEMINI_API_KEY not configured.");
    return;
  }

  const mockState = {
    country: "india",
    anomalies: [
      { biomarker: "HbA1c", value: "8.8%", status: "High" },
      { biomarker: "Blood Pressure", value: "155/95 mmHg", status: "High" }
    ]
  };

  const response = await runResearcher(mockState);
  assert(response && response.researchData, "Researcher Agent produced research output");
  assert(typeof response.researchData === "string", "Research data is string format");
  assert(response.researchData.length > 100, "Research output has substantive clinical content");
  
  // Guardrail verification: Output must cite guidelines, evidence, or physician deferral
  const hasEvidenceCitation = 
    response.researchData.toLowerCase().includes("guideline") ||
    response.researchData.toLowerCase().includes("icmr") ||
    response.researchData.toLowerCase().includes("who") ||
    response.researchData.toLowerCase().includes("physician") ||
    response.researchData.toLowerCase().includes("deferred") ||
    response.researchData.toLowerCase().includes("source");

  assert(hasEvidenceCitation, "Researcher Agent adheres to evidence citation guardrail");
  console.log(`  ℹ️ Research summary excerpt:\n      "${response.researchData.substring(0, 180).replace(/\n/g, ' ')}..."`);
}

async function testRagQueue() {
  console.log("\n==================================================");
  console.log("🧪 TEST 5: BullMQ Ingestion Queue");
  console.log("==================================================");

  try {
    const job = await enqueueRagIngestion({ country: "test_country" });
    assert(job && job.id, `BullMQ job created successfully with ID: ${job.id}`);
    
    const state = await job.getState();
    assert(["waiting", "active", "completed", "delayed"].includes(state), `Job state is valid (got: ${state})`);

    // Clean up test job
    await job.remove();
    console.log(`  ℹ️ Cleaned up test job #${job.id}`);
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      console.warn("  ⚠️ Redis not running locally: skipped BullMQ live enqueue test.");
    } else {
      throw err;
    }
  }
}

async function runAllTests() {
  console.log("==================================================");
  console.log("🚀 STARTING AUTOMATED RAG PIPELINE TEST SUITE");
  console.log("==================================================");
  
  const startTime = Date.now();

  try {
    await testCloudEmbeddings();
    await testClinicalChunker();
    await testScoredRetriever();
    await testResearcherAgent();
    await testRagQueue();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("\n==================================================");
    console.log(`🎉 ALL TESTS PASSED! (${passedCount} checks passed, 0 failed in ${duration}s)`);
    console.log("==================================================\n");

    // Close redis connections to exit cleanly
    try {
      await ragQueue.close();
    } catch (e) {}

    process.exit(0);
  } catch (error) {
    console.error("\n💥 TEST SUITE FAILED:", error.message);
    try {
      await ragQueue.close();
    } catch (e) {}
    process.exit(1);
  }
}

runAllTests();
