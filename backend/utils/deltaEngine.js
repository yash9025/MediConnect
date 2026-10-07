/**
 * Deterministic Delta Calculation Engine
 * 
 * Computes exact mathematical trajectories between current and historical biomarkers.
 * This prevents the LLM from hallucinating math and forces it to acknowledge
 * edge cases like "Improving_But_Abnormal".
 */

/**
 * Standardize biomarker names for matching (e.g. "Fasting Blood Sugar" -> "fastingbloodsugar")
 */
function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Determine the clinical trajectory state based on changes and current status
 */
function determineTrajectory(prevStatus, currentStatus, deltaPct, isValueHigher) {
  // If the status is now Normal, the patient has Normalized
  if (currentStatus === "Normal" && prevStatus !== "Normal") {
    return "Normalized";
  }
  
  if (currentStatus === "Normal" && prevStatus === "Normal") {
    return "Stable_Normal";
  }

  // Still abnormal logic
  if (currentStatus === "High") {
    // If it's High, a decrease is an improvement
    if (deltaPct < -5) return "Improving_But_Abnormal"; // Dropped by >5%
    if (deltaPct > 5) return "Worsening";               // Increased by >5%
    return "Stable_Abnormal";
  }

  if (currentStatus === "Low") {
    // If it's Low, an increase is an improvement
    if (deltaPct > 5) return "Improving_But_Abnormal"; // Increased by >5%
    if (deltaPct < -5) return "Worsening";               // Dropped by >5%
    return "Stable_Abnormal";
  }

  return "Unknown_Trajectory";
}

/**
 * Calculate deltas between two sets of biomarkers
 * @param {Array} currentBiomarkers 
 * @param {Array} previousBiomarkers 
 * @returns {Object} Map of biomarker deltas
 */
export function calculateDeltas(currentBiomarkers = [], previousBiomarkers = []) {
  const deltas = {};

  // Build a lookup map for previous biomarkers
  const prevMap = {};
  for (const marker of previousBiomarkers) {
    if (marker && marker.name) {
      prevMap[normalizeName(marker.name)] = marker;
    }
  }

  for (const current of currentBiomarkers) {
    if (!current || !current.name || typeof current.value !== 'number') continue;

    const normName = normalizeName(current.name);
    const prev = prevMap[normName];

    if (prev && typeof prev.value === 'number') {
      // Unit mismatch guardrail
      if (current.unit !== prev.unit) {
        deltas[current.name] = {
          status: "Incomparable_Units",
          message: `Units changed from ${prev.unit} to ${current.unit}. Cannot compute strict delta.`
        };
        continue;
      }

      // Calculate absolute and percentage change
      const absoluteChange = current.value - prev.value;
      let deltaPct = 0;
      
      if (prev.value !== 0) {
        deltaPct = (absoluteChange / prev.value) * 100;
      }

      const trajectory = determineTrajectory(prev.status, current.status, deltaPct, absoluteChange > 0);

      // Format as +10% or -5%
      const formattedPct = deltaPct > 0 ? `+${deltaPct.toFixed(1)}%` : `${deltaPct.toFixed(1)}%`;

      deltas[current.name] = {
        previousValue: prev.value,
        currentValue: current.value,
        unit: current.unit,
        absoluteChange: absoluteChange.toFixed(2),
        deltaPct: formattedPct,
        clinicalTrajectory: trajectory
      };
    }
  }

  return deltas;
}
