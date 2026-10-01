import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "@langchain/core/documents";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { getEmbeddings } from "../config/embeddings.js";
import { splitClinicalDocuments } from "../utils/clinicalChunker.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COUNTRY_CONFIGS = [
    { country: "india", path: path.join(__dirname, "../Knowledge_Base/india"), authority: "ICMR/MoHFW" },
    { country: "usa", path: path.join(__dirname, "../Knowledge_Base/usa"), authority: "ACC/AHA/ADA" },
    { country: "uk", path: path.join(__dirname, "../Knowledge_Base/uk"), authority: "NICE/NHS" },
    { country: "brazil", path: path.join(__dirname, "../Knowledge_Base/brazil"), authority: "Ministério da Saúde" },
    { country: "global", path: path.join(__dirname, "../Knowledge_Base/global"), authority: "WHO" },
];

const CONFIG = {
    PINECONE_INDEX: "mediconnect",
    EMBEDDING_MODEL: "text-embedding-004",
    CHUNK_SIZE: 1500,
    CHUNK_OVERLAP: 200,
    BATCH_SIZE: 50, 
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
};

const documentEmbeddings = getEmbeddings("RETRIEVAL_DOCUMENT");
const queryEmbeddings = getEmbeddings("RETRIEVAL_QUERY");

export const buildMedicalIndex = async (targetCountry = null, onProgress = null) => {
    console.log("[INFO] Starting MediConnect Data Ingestion...");
    if (targetCountry) {
        console.log(`[INFO] Target Country Filter: ${targetCountry}`);
    }

    if (!CONFIG.PINECONE_API_KEY) {
        throw new Error("[FATAL] Missing PINECONE_API_KEY.");
    }

    const pinecone = new Pinecone({ apiKey: CONFIG.PINECONE_API_KEY });

    try {
        // Check and provision index if needed
        console.log("[INFO] Verifying Pinecone index...");
        const existingIndexes = await pinecone.listIndexes();
        const indexExists = existingIndexes.indexes?.some(idx => idx.name === CONFIG.PINECONE_INDEX);

        if (!indexExists) {
            console.log(`[WARN] Index '${CONFIG.PINECONE_INDEX}' not found. Creating...`);
            await pinecone.createIndex({
                name: CONFIG.PINECONE_INDEX,
                dimension: 768,
                metric: 'cosine',
                spec: { serverless: { cloud: 'aws', region: 'us-east-1' } }
            });
            console.log("[INFO] Index creating. Waiting 10s...");
            await new Promise(resolve => setTimeout(resolve, 10000));
        }

        const pineconeIndex = pinecone.Index(CONFIG.PINECONE_INDEX);

        const foldersToIngest = targetCountry 
            ? COUNTRY_CONFIGS.filter(c => c.country.toLowerCase() === targetCountry.toLowerCase())
            : COUNTRY_CONFIGS;

        if (foldersToIngest.length === 0) {
            console.warn(`[WARN] No matching folder configuration found for country: ${targetCountry}`);
            return;
        }

        // Load PDFs
        console.log("[INFO] Loading source PDFs from Knowledge_Base folders...");
        const rawDocs = [];

        for (const folderConfig of foldersToIngest) {
            if (!fs.existsSync(folderConfig.path)) {
                console.log(`[WARN] Directory missing: ${folderConfig.path}`);
                continue;
            }

            const pdfFiles = fs.readdirSync(folderConfig.path).filter(file => file.toLowerCase().endsWith('.pdf'));
            console.log(`[INFO] Found ${pdfFiles.length} PDFs in ${folderConfig.country.toUpperCase()} folder (${folderConfig.path})`);
            
            for (const pdfFile of pdfFiles) {
                const filePath = path.join(folderConfig.path, pdfFile);
                try {
                    const loader = new PDFLoader(filePath, { splitPages: true });
                    const docs = await loader.load();
                    
                    docs.forEach(doc => {
                        doc.metadata.country = folderConfig.country;
                        doc.metadata.authority = folderConfig.authority;
                    });
                    
                    rawDocs.push(...docs);
                    console.log(`[INFO] Loaded: ${pdfFile} (${docs.length} pages) for [${folderConfig.country.toUpperCase()} - ${folderConfig.authority}]`);
                } catch (err) {
                    console.error(`[ERROR] Failed to load ${pdfFile}: ${err.message}`);
                }
            }
        }

        if (rawDocs.length === 0) {
            console.log("[WARN] No PDF documents found to ingest.");
            return { success: true, count: 0 };
        }

        // Enrich Metadata
        console.log("[INFO] Enriching metadata with country, authority, and medical domain...");
        const enrichedDocs = rawDocs.map(doc => {
            const sourceName = path.basename(doc.metadata.source, '.pdf');
            const classification = categorizeDocument(sourceName);
            return new Document({
                pageContent: doc.pageContent,
                metadata: {
                    source_file: sourceName,
                    country: doc.metadata.country || "global",
                    authority: doc.metadata.authority || "WHO",
                    category: classification.category,
                    domain: classification.domain,
                    condition: classification.condition,
                    ministry: doc.metadata.authority || "ICMR/MoHFW",
                    doc_type: "Standard Treatment Guidelines",
                },
            });
        });

        // Split Text with Clinical-Grade Chunker (Context Header Injection & Biomarker Tagging)
        console.log("[INFO] Segmenting text with Clinical Chunker & Context Header Injection...");
        const splitDocs = await splitClinicalDocuments(enrichedDocs, {
            chunkSize: CONFIG.CHUNK_SIZE,
            chunkOverlap: CONFIG.CHUNK_OVERLAP,
        });
        console.log(`[INFO] Generated ${splitDocs.length} clinically enriched chunks.`);

        // Upsert to Pinecone in batches
        console.log(`[INFO] Upserting in batches of ${CONFIG.BATCH_SIZE}...`);
        const totalBatches = Math.ceil(splitDocs.length / CONFIG.BATCH_SIZE);
        
        for (let i = 0; i < splitDocs.length; i += CONFIG.BATCH_SIZE) {
            const batch = splitDocs.slice(i, i + CONFIG.BATCH_SIZE);
            const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
            
            console.log(`[INFO] Processing batch ${batchNum}/${totalBatches}...`);
            await PineconeStore.fromDocuments(batch, documentEmbeddings, {
                pineconeIndex: pineconeIndex,
                maxConcurrency: 3,
            });

            if (onProgress) {
                onProgress({
                    batch: batchNum,
                    totalBatches,
                    percent: Math.round((batchNum / totalBatches) * 100),
                    chunksProcessed: Math.min(i + CONFIG.BATCH_SIZE, splitDocs.length),
                    totalChunks: splitDocs.length
                });
            }

            // Free-tier rate limit throttle (600ms pause between batches)
            if (i + CONFIG.BATCH_SIZE < splitDocs.length) {
                await new Promise(r => setTimeout(r, 600));
            }
        }

        console.log("[SUCCESS] Multi-region Ingestion complete.");
        return { success: true, count: splitDocs.length };

    } catch (error) {
        console.error("[FATAL] Ingestion failed:", error.message);
        throw error;
    }
};

function categorizeDocument(filename) {
    const lowerName = filename.toLowerCase();
    
    // Cardiovascular / Hypertension / Lipid
    if (lowerName.includes("hypertension") || lowerName.includes("heart failure") || 
        lowerName.includes("myocardial") || lowerName.includes("cardio") || 
        lowerName.includes("bp") || lowerName.includes("chroltrol") || 
        lowerName.includes("cholesterol") || lowerName.includes("lipid")) {
        return { category: "Cardiovascular", domain: "Cardiology", condition: filename };
    }
    
    // Endocrinology / Diabetes / Thyroid
    if (lowerName.includes("diabet") || lowerName.includes("hypothyroid") || 
        lowerName.includes("endo") || lowerName.includes("glucose")) {
        return { category: "Endocrinology", domain: "Endocrinology", condition: filename };
    }
    
    // Hematology / Anemia / Hemoglobin
    if (lowerName.includes("anaemia") || lowerName.includes("anemia") || 
        lowerName.includes("hema") || lowerName.includes("hemoglobin") || 
        lowerName.includes("iron")) {
        return { category: "Hematology", domain: "Hematology", condition: filename };
    }
    
    // Nephrology
    if (lowerName.includes("kidney") || lowerName.includes("aki") || 
        lowerName.includes("ckd") || lowerName.includes("nephro")) {
        return { category: "Nephrology", domain: "Nephrology", condition: filename };
    }
    
    // Gastroenterology / Liver
    if (lowerName.includes("liver") || lowerName.includes("jaundice") || 
        lowerName.includes("gastro")) {
        return { category: "Gastroenterology", domain: "Gastroenterology", condition: filename };
    }
    
    // Dermatology
    if (lowerName.includes("skin") || lowerName.includes("derma") || 
        lowerName.includes("bacterial")) {
        return { category: "Dermatology", domain: "Dermatology", condition: filename };
    }
    
    // Infectious Disease
    if (lowerName.includes("dengue") || lowerName.includes("malaria") || 
        lowerName.includes("tb") || lowerName.includes("tuberculosis") || 
        lowerName.includes("ntep")) {
        return { category: "Infectious Disease", domain: "Infectious Disease", condition: filename };
    }
    
    // General Medicine / WHO PEN
    return { category: "General Medicine", domain: "General Medicine", condition: filename };
}

/**
 * Tiered retrieval query:
 * 1. Queries with metadata filter `country: selectedCountry`
 * 2. If results < k and selectedCountry != 'global', falls back to WHO `country: 'global'`
 */
export const queryIndexTiered = async (query, country = "india", k = 3) => {
    if (!CONFIG.PINECONE_API_KEY) throw new Error("Missing API Key");

    const pinecone = new Pinecone({ apiKey: CONFIG.PINECONE_API_KEY });
    const pineconeIndex = pinecone.Index(CONFIG.PINECONE_INDEX);

    console.log(`[DIAGNOSTIC] Tiered Query for: "${query}" | Primary Country: [${country}] (Target k: ${k})`);

    const vectorStore = await PineconeStore.fromExistingIndex(queryEmbeddings, {
        pineconeIndex: pineconeIndex,
    });

    // 1. Primary country search
    let results = await vectorStore.similaritySearch(query, k, {
        country: { $eq: country.toLowerCase() }
    });

    console.log(`[DIAGNOSTIC] Primary search [${country}]: Found ${results.length} results.`);

    // 2. Fallback to global (WHO) if shortfall
    if (results.length < k && country.toLowerCase() !== "global") {
        const remaining = k - results.length;
        console.log(`[DIAGNOSTIC] Country [${country}] has < ${k} results. Querying WHO global fallback for ${remaining} doc(s)...`);
        
        const globalResults = await vectorStore.similaritySearch(query, remaining, {
            country: { $eq: "global" }
        });
        results = [...results, ...globalResults];
    }

    results.forEach((doc, i) => {
        console.log(`\n${i + 1}. [${doc.metadata.country.toUpperCase()} | ${doc.metadata.authority}] ${doc.metadata.source_file} (${doc.metadata.domain})`);
        console.log(`   "${doc.pageContent.substring(0, 150)}..."`);
    });

    return results;
};

// CLI Entry Point
const isDirectCli = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('ingestData.js');
if (isDirectCli) {
    const args = process.argv.slice(2);
    const command = args[0];

    if (command === "build") {
        const target = args[1] || null;
        buildMedicalIndex(target);
    } else if (command === "query") {
        const queryText = args[1] || "diabetes treatment guidelines";
        const country = args[2] || "india";
        queryIndexTiered(queryText, country);
    } else {
        console.log("Usage: node ingestData.js [build [country] | query <text> [country]]");
    }
}