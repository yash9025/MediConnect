/**
 * Calculates production score for each candidate doctor
 * using the Two-Tier Gated Scoring Formula:
 * Final Score = Gate * ((w_slot * S_slot) + (w_cont * S_cont) + (w_load * S_load))
 */
export const rankDoctorsForPatient = ({
  doctors,
  attendingDoctorId = null,
  urgency = "NORMAL", // "CRITICAL" | "HIGH" | "NORMAL"
  targetSpecialty = "",
}) => {
  const isEmergency = urgency === "CRITICAL" || urgency === "HIGH";

  // Dynamic clinical weights (Emergency = Speed dominates; Chronic = Continuity dominates)
  const weights = isEmergency
    ? { w_slot: 0.80, w_cont: 0.10, w_load: 0.10 }
    : { w_slot: 0.30, w_cont: 0.50, w_load: 0.20 };

  const scoredDoctors = doctors.map((doc) => {
    // 1. HARD GATE: (Specialty Match) AND (Doctor is Active/Available)
    const targetRoot = targetSpecialty.replace(/(ist|y|ies)$/i, '');
    const isSpecialtyMatch = new RegExp(targetRoot, 'i').test(doc.speciality);
    const isAvailable = Boolean(doc.available);
    const gate = (isSpecialtyMatch && isAvailable) ? 1 : 0;

    if (gate === 0) {
      return { ...doc.toObject ? doc.toObject() : doc, score: 0, gatePassed: false };
    }

    // 2. Component Scores (0 to 100)
    // S_slot: Estimated wait minutes to earliest open slot
    const waitMinutes = doc.estimatedWaitMinutes || 60; // Fallback to 60 if missing from Redis OPD queue
    const S_slot = Math.max(0, 100 - Math.round(waitMinutes / 3));

    // S_cont: Is this the patient's attending physician?
    const isAttending = attendingDoctorId && String(doc._id) === String(attendingDoctorId);
    const S_cont = isAttending ? 100 : 0;

    // S_load: Active patients waiting in their OPD queue
    const activeQueue = doc.activeQueueLength || 0;
    const S_load = Math.max(0, 100 - (activeQueue * 10));

    // 3. Composite Calculation
    const totalScore = Math.round(
      (weights.w_slot * S_slot) + 
      (weights.w_cont * S_cont) + 
      (weights.w_load * S_load)
    );

    return {
      ...(doc.toObject ? doc.toObject() : doc),
      score: totalScore,
      gatePassed: true,
      isAttendingDoctor: isAttending,
      metrics: { S_slot, S_cont, S_load, waitMinutes, activeQueue }
    };
  });

  // Sort descending by score
  return scoredDoctors
    .filter(d => d.gatePassed)
    .sort((a, b) => b.score - a.score);
};
