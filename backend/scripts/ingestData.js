import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import { Document } from "@langchain/core/documents";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
    PDF_FOLDER: path.join(__dirname, "../data"),
    PINECONE_INDEX: "mediconnect",
    EMBEDDING_MODEL: "Xenova/all-mpnet-base-v2",
    CHUNK_SIZE: 800,
    CHUNK_OVERLAP: 150,
    BATCH_SIZE: 100, 
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
};

const embeddings = new HuggingFaceTransformersEmbeddings({
    model: CONFIG.EMBEDDING_MODEL,
});

export const buildMedicalIndex = async () => {
    console.log("[INFO] Starting MediConnect Data Ingestion...");

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

        // Load PDFs
        console.log("[INFO] Loading source PDFs...");
        if (!fs.existsSync(CONFIG.PDF_FOLDER)) {
            throw new Error(`[FATAL] Data directory missing: ${CONFIG.PDF_FOLDER}`);
        }

        const pdfFiles = fs.readdirSync(CONFIG.PDF_FOLDER).filter(file => file.toLowerCase().endsWith('.pdf'));
        const rawDocs = [];

        for (const pdfFile of pdfFiles) {
            const filePath = path.join(CONFIG.PDF_FOLDER, pdfFile);
            try {
                const loader = new PDFLoader(filePath, { splitPages: true });
                const docs = await loader.load();
                rawDocs.push(...docs);
                console.log(`[INFO] Loaded: ${pdfFile} (${docs.length} pages)`);
            } catch (err) {
                console.error(`[ERROR] Failed to load ${pdfFile}: ${err.message}`);
            }
        }

        // Enrich Metadata
        console.log("[INFO] Enriching metadata...");
        const enrichedDocs = rawDocs.map(doc => {
            const sourceName = path.basename(doc.metadata.source, '.pdf');
            return new Document({
                pageContent: doc.pageContent,
                metadata: {
                    source_file: sourceName,
                    category: categorizeDocument(sourceName),
                    ministry: "Ministry of Health & Family Welfare, India",
                    doc_type: "Standard Treatment Guidelines",
                },
            });
        });

        // Split Text
        console.log("[INFO] Segmenting text...");
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: CONFIG.CHUNK_SIZE,
            chunkOverlap: CONFIG.CHUNK_OVERLAP,
        });

        const splitDocs = await splitter.splitDocuments(enrichedDocs);
        console.log(`[INFO] Generated ${splitDocs.length} chunks.`);

        // Upsert to Pinecone in batches
        console.log(`[INFO] Upserting in batches of ${CONFIG.BATCH_SIZE}...`);
        const totalBatches = Math.ceil(splitDocs.length / CONFIG.BATCH_SIZE);
        
        for (let i = 0; i < splitDocs.length; i += CONFIG.BATCH_SIZE) {
            const batch = splitDocs.slice(i, i + CONFIG.BATCH_SIZE);
            const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
            
            console.log(`[INFO] Processing batch ${batchNum}/${totalBatches}...`);
            await PineconeStore.fromDocuments(batch, embeddings, {
                pineconeIndex: pineconeIndex,
                maxConcurrency: 3,
            });
        }

        console.log("[SUCCESS] Ingestion complete.");
        return { success: true };

    } catch (error) {
        console.error("[FATAL] Ingestion failed:", error);
        process.exit(1);
    }
};

function categorizeDocument(filename) {
    const lowerName = filename.toLowerCase();
    if (lowerName.includes("diabet")) return "Diabetes";
    if (lowerName.includes("hypertension")) return "Cardiovascular";
    if (lowerName.includes("anaemia") || lowerName.includes("anemia")) return "Hematology";
    if (lowerName.includes("thyroid")) return "Endocrinology";
    if (lowerName.includes("dengue") || lowerName.includes("malaria")) return "Infectious Disease";
    return "General Medicine";
}

export const queryIndex = async (query, k = 3) => {
    if (!CONFIG.PINECONE_API_KEY) throw new Error("Missing API Key");

    const pinecone = new Pinecone({ apiKey: CONFIG.PINECONE_API_KEY });
    const pineconeIndex = pinecone.Index(CONFIG.PINECONE_INDEX);

    console.log(`[DIAGNOSTIC] Querying for: "${query}"...`);

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex: pineconeIndex,
    });

    const results = await vectorStore.similaritySearch(query, k);

    results.forEach((doc, i) => {
        console.log(`${i + 1}. [${doc.metadata.category}] ${doc.metadata.source_file}`);
        console.log(`   "${doc.pageContent.substring(0, 150)}..."\n`);
    });
};

// CLI Entry Point
const args = process.argv.slice(2);
const command = args[0];

if (command === "build" || command === undefined) {
    buildMedicalIndex();
} else if (command === "query") {
    const queryText = args.slice(1).join(" ") || "diabetes treatment guidelines";
    queryIndex(queryText);
} else {
    console.log("Usage: node ingestData.js [build | query <text>]");
}