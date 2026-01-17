# 🛠️ Backend Development Log & Engineering Decisions

This log tracks significant technical challenges, race conditions, and architectural optimizations encountered during the development of MediConnect.

---

## 📅 [2026-01-16] Feature: Dynamic Wait Time Algorithm
**Severity:** MEDIUM (UX Impact)  
**Component:** `doctorController.js` -> `nextPatient` logic

### 🚩 The Challenge
The initial queue system displayed a static wait time (e.g., "15 mins per patient").
However, real-world testing showed this was inaccurate. If a doctor spent 30 minutes with a complex case, the queue estimates for all subsequent patients became wrong, leading to user frustration.

I considered using a "Global Average" of all appointments, but that metric is too slow to react. If a doctor slows down *right now*, the system needs to reflect that immediately.

### 🔧 The Solution: "Sliding Window" Average
I implemented a **Rolling Average Algorithm** that only considers the **last 3 completed consultations**.

1. **Why 3?** It provides the perfect balance between stability and responsiveness. A single long appointment updates the wait time immediately for the next person.
2. **Implementation:**
   - Tracking `consultationTimes` in an array in the Doctor model.
   - Using `Array.slice(-3)` to isolate the recent window.
   - Calculating the mean of this window to update `avgConsultationTime`.

```javascript
// The fix implemented in nextPatient controller
const recentStats = consultationTimes.slice(-3); // Get last 3
avgConsultationTime = Math.round(recentStats.reduce((a, b) => a + b, 0) / recentStats.length);