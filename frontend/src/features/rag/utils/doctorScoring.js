const SCORING_WEIGHTS = {
  AVAILABILITY: 0.50, // Primary factor (50%)
  EXPERIENCE: 0.25,
  SPECIALTY: 0.15,
  PRICING: 0.10,
};

const OPTIMAL_FEE_RANGE = {
  MIN: 30,
  MAX: 150,
  IDEAL: 60,
};

// --- Helper Functions ---

const extractExperience = (experience) => {
  if (typeof experience === 'number') return experience;
  const match = String(experience || '0').match(/\d+/);
  return match ? parseInt(match[0]) : 0;
};

const countBookedSlots = (slotsBooked) => {
  if (!slotsBooked || typeof slotsBooked !== 'object') return 0;
  return Object.values(slotsBooked).reduce((total, daySlots) => {
    return total + (Array.isArray(daySlots) ? daySlots.length : 0);
  }, 0);
};

// --- Scoring Logic ---

const calculateExperienceScore = (years) => {
  if (years <= 0) return 0;
  if (years >= 30) return 100;
  // Logarithmic scale: diminishing returns after ~20 years
  return Math.min(100, (Math.log(years + 1) / Math.log(31)) * 100);
};

const calculateAvailabilityScore = (bookedSlots) => {
  if (bookedSlots <= 0) return 100; // Top priority
  if (bookedSlots >= 20) return 0;  // Low priority
  // Each booking reduces score by 5 points
  return Math.max(0, 100 - (bookedSlots * 5));
};

const calculatePricingScore = (fees) => {
  if (!fees || fees <= 0) return 50;
  
  const { MIN, MAX, IDEAL } = OPTIMAL_FEE_RANGE;
  
  if (fees < MIN) {
    return 50 + ((fees / MIN) * 30); // Too low
  } else if (fees <= IDEAL) {
    return 80 + ((fees - MIN) / (IDEAL - MIN)) * 20; // Optimal
  } else if (fees <= MAX) {
    return 100 - ((fees - IDEAL) / (MAX - IDEAL)) * 30; // Acceptable
  } else {
    const excessRatio = Math.min((fees - MAX) / MAX, 1);
    return Math.max(30, 70 - (excessRatio * 40)); // Expensive
  }
};

const calculateSpecialtyScore = (requiredSpecialty, doctorSpecialty) => {
  if (!requiredSpecialty || !doctorSpecialty) return 50;
  
  const required = requiredSpecialty.toLowerCase().trim();
  const doctor = doctorSpecialty.toLowerCase().trim();
  
  if (doctor === required) return 100;
  if (doctor.includes(required) || required.includes(doctor)) return 80;
  
  return 40;
};

// --- Main Exported Functions ---

export const calculateDoctorScore = (doctor, recommendedSpecialty = '') => {
  const experience = extractExperience(doctor.experience);
  const bookedSlots = countBookedSlots(doctor.slots_booked);
  const fees = parseFloat(doctor.fees) || 0;
  
  const availabilityScore = calculateAvailabilityScore(bookedSlots);
  const experienceScore = calculateExperienceScore(experience);
  const specialtyScore = calculateSpecialtyScore(recommendedSpecialty, doctor.speciality);
  const pricingScore = calculatePricingScore(fees);
  
  const totalScore = (
    (availabilityScore * SCORING_WEIGHTS.AVAILABILITY) +
    (experienceScore * SCORING_WEIGHTS.EXPERIENCE) +
    (specialtyScore * SCORING_WEIGHTS.SPECIALTY) +
    (pricingScore * SCORING_WEIGHTS.PRICING)
  );
  
  return Math.round(totalScore);
};

export const sortDoctorsByScore = (doctors, recommendedSpecialty = '') => {
  return doctors
    .map(doctor => ({
      ...doctor,
      score: calculateDoctorScore(doctor, recommendedSpecialty),
    }))
    .sort((a, b) => b.score - a.score);
};

export const getScoreBreakdown = (doctor, recommendedSpecialty = '') => {
  const experience = extractExperience(doctor.experience);
  const bookedSlots = countBookedSlots(doctor.slots_booked);
  const fees = parseFloat(doctor.fees) || 0;
  
  return {
    experience: {
      value: experience,
      score: calculateExperienceScore(experience),
      weight: SCORING_WEIGHTS.EXPERIENCE,
    },
    availability: {
      bookedSlots,
      score: calculateAvailabilityScore(bookedSlots),
      weight: SCORING_WEIGHTS.AVAILABILITY,
    },
    pricing: {
      fees,
      score: calculatePricingScore(fees),
      weight: SCORING_WEIGHTS.PRICING,
    },
    specialty: {
      required: recommendedSpecialty,
      doctor: doctor.speciality,
      score: calculateSpecialtyScore(recommendedSpecialty, doctor.speciality),
      weight: SCORING_WEIGHTS.SPECIALTY,
    },
    total: calculateDoctorScore(doctor, recommendedSpecialty),
  };
};