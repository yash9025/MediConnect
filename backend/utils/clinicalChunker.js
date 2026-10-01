import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";

/**
 * Clinical Section Regex Patterns to identify key medical guideline sections
 */
const CLINICAL_SECTION_PATTERNS = [
  { type: "contraindications", regex: /(contraindication|warning|precaution|red flag|adverse effect|when not to use)/i },
  { type: "dosage", regex: /(dosage|dose|administration|posology|drug regimen|schedule)/i },
  { type: "treatment", regex: /(treatment|management|first-line|therapy|pharmacological|intervention)/i },
  { type: "diagnosis", regex: /(diagnosis|diagnostic criteria|clinical features|symptoms|screening|assessment)/i },
  { type: "monitoring", regex: /(follow-up|monitoring|surveillance|referral criteria)/i },
];

/**
 * Known clinical biomarkers for automatic metadata tagging
 */
const COMMON_BIOMARKERS = [
  "hba1c", "blood pressure", "systolic", "diastolic", "glucose", "fasting blood sugar",
  "cholesterol", "ldl", "hdl", "triglycerides", "creatinine", "egfr", "bun",
  "hemoglobin", "platelets", "wbc", "rbc", "ferritin", "tsh", "t3", "t4",
  "alt", "ast", "bilirubin", "uric acid", "dengue ns1", "igm", "potassium", "sodium"
];

/**
 * Detect the dominant clinical section type from text
 * @param {string} text
 * @returns {string} - 'contraindications' | 'dosage' | 'treatment' | 'diagnosis' | 'monitoring' | 'general'
 */
export function detectSectionType(text) {
  for (const { type, regex } of CLINICAL_SECTION_PATTERNS) {
    if (regex.test(text)) {
      return type;
    }
  }
  return "general";
}

/**
 * Detect biomarkers mentioned in the text snippet
 * @param {string} text
 * @returns {string[]}
 */
export function extractBiomarkers(text) {
  const lower = text.toLowerCase();
  const detected = [];
  for (const marker of COMMON_BIOMARKERS) {
    if (lower.includes(marker)) {
      detected.push(marker);
    }
  }
  return detected;
}

/**
 * Splits enriched documents into clinical chunks with context header injection.
 * 
 * Preserves clinical safety:
 * 1. Injects breadcrumb context header: `[Authority: ICMR | Domain: Cardiology | Guideline: Hypertension | Section: Dosage]`
 *    This ensures that even short chunks (e.g. "Take 5mg once daily") never lose the identity of the condition or drug.
 * 2. Enriches each chunk with `section_type` and `biomarkers` in Pinecone metadata.
 * 
 * @param {Array<Document>} documents - List of raw LangChain Documents
 * @param {Object} options
 * @param {number} options.chunkSize - Target characters per chunk (default: 1200)
 * @param {number} options.chunkOverlap - Overlap characters (default: 200)
 * @returns {Promise<Array<Document>>}
 */
export async function splitClinicalDocuments(documents, { chunkSize = 1200, chunkOverlap = 200 } = {}) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: [
      "\n\n\n",
      "\n\n",
      "\nSection",
      "\nTable",
      "\n",
      ". ",
      " ",
      ""
    ],
  });

  const rawChunks = await splitter.splitDocuments(documents);
  const clinicalChunks = [];

  for (let i = 0; i < rawChunks.length; i++) {
    const chunk = rawChunks[i];
    const text = chunk.pageContent.trim();
    if (!text || text.length < 50) continue; // Skip near-empty fragments

    const meta = chunk.metadata || {};
    const sectionType = detectSectionType(text);
    const biomarkers = extractBiomarkers(text);

    // Injected Breadcrumb Context Header (solves the "lost context" problem during vectorization)
    const contextHeader = `[Guideline: ${meta.authority || 'WHO'} | Country: ${(meta.country || 'Global').toUpperCase()} | Domain: ${meta.domain || 'General Medicine'} | Source: ${meta.source_file || 'Clinical Document'} | Section: ${sectionType.toUpperCase()}]`;
    const enrichedContent = `${contextHeader}\n${text}`;

    clinicalChunks.push(new Document({
      pageContent: enrichedContent,
      metadata: {
        ...meta,
        section_type: sectionType,
        biomarkers: biomarkers.length > 0 ? biomarkers : ["general"],
        chunk_index: i,
        char_length: enrichedContent.length,
      }
    }));
  }

  return clinicalChunks;
}
