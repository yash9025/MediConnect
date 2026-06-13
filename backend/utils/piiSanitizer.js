// Local Regex-based PII Sanitizer (Deterministic masking layer)

// Regex patterns for common sensitive data
const PII_PATTERNS = {
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  PHONE: /(\+\d{1,2}\s?)?1?\-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
  SSN_AADHAAR: /\b\d{4}\s\d{4}\s\d{4}\b|\b\d{3}-\d{2}-\d{4}\b/g, // Simple Aadhaar / SSN formats
  NAME_HEURISTIC: /Patient Name:\s*([A-Za-z\s]+)|Patient:\s*([A-Za-z\s]+)/gi // Basic heuristic for medical reports
};

/**
 * Extracts and masks PII from a raw text document.
 * @param {string} rawText - The unmasked OCR text.
 * @returns {object} { cleanText, piiMap }
 */
export async function sanitizeMedicalReport(rawText) {
  const piiMap = new Map();
  let cleanText = rawText;
  let counter = 0;

  const replaceEntity = (match, type) => {
    // If it's a capture group (like from NAME_HEURISTIC), get the actual name string
    const valueToMask = Array.isArray(match) ? match[1] || match[2] : match;
    if (!valueToMask || valueToMask.trim() === "") return match;

    const token = `[${type}_${counter++}]`;
    piiMap.set(token, valueToMask.trim());
    
    // Replace just the captured value, leaving surrounding text intact
    return match.replace(valueToMask.trim(), token);
  };

  // Mask Emails
  cleanText = cleanText.replace(PII_PATTERNS.EMAIL, (match) => replaceEntity(match, 'EMAIL'));
  
  // Mask Phones
  cleanText = cleanText.replace(PII_PATTERNS.PHONE, (match) => replaceEntity(match, 'PHONE'));
  
  // Mask IDs
  cleanText = cleanText.replace(PII_PATTERNS.SSN_AADHAAR, (match) => replaceEntity(match, 'ID'));

  // Mask Names based on common report structures
  cleanText = cleanText.replace(PII_PATTERNS.NAME_HEURISTIC, (match, p1, p2) => {
    const name = p1 || p2;
    if (name) {
      const token = `[NAME_${counter++}]`;
      piiMap.set(token, name.trim());
      return match.replace(name.trim(), token);
    }
    return match;
  });

  return { cleanText, piiMap };
}

/**
 * Replaces tokens in the LLM output with the original sensitive data.
 * @param {string} llmOutput - The synthesized string from LangGraph.
 * @param {Map} piiMap - The map generated during sanitization.
 * @returns {string} The fully rehydrated string.
 */
export function rehydrateMedicalReport(llmOutput, piiMap) {
  let finalReport = llmOutput;
  piiMap.forEach((realValue, token) => {
    // Using global replace in case the LLM mentions the token multiple times
    const regex = new RegExp(`\\[${token.replace(/\[|\]/g, '')}\\]`, 'g');
    finalReport = finalReport.replace(regex, realValue);
  });
  return finalReport;
}
