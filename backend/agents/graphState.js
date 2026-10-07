import { Annotation } from "@langchain/langgraph";

// Central State definition for the entire multi-agent pipeline
export const GraphState = Annotation.Root({
  // The sanitized input text containing the medical report data
  rawPdfText: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),

  // Extractor output fields
  isValidBloodReport: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => true,
  }),
  rejectionReason: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  country: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "india",
  }),
  anomalies: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  
  // Historical context for Longitudinal Tracking
  historicalContext: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  // Synthesizer guardrail tracker
  isOutputAccurate: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),
  loopCount: Annotation({
    reducer: (current, next) => next, // Overwrites with the latest number
    default: () => 0,
  }),
  
  // Future fields for other agents
  researchData: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  lifestyleData: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  // Multi-Agent routing fields
  requiredSpecialists: Annotation({
    reducer: (current, next) => next, 
    default: () => [],
  }),
  specialistReports: Annotation({
    reducer: (current, next) => [...current, ...next], // Accumulate reports from parallel branches
    default: () => [],
  }),
  finalSummary: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
});
