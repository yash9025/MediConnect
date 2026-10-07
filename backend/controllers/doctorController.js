import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connection as redis } from "../config/redis.js";
import { enqueueOpdSync } from "../workers/opdQueue.js";

// --- Utility Helpers ---

const getTodayStr = () => {
  const today = new Date();
  return `${String(today.getDate()).padStart(2, "0")}_${String(today.getMonth() + 1).padStart(2, "0")}_${today.getFullYear()}`;
};

const parseSlotMinutes = (slotTime) => {
  if (!slotTime) return 0;
  const match = slotTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;

  let [_, hours, minutes, period] = match;
  hours = parseInt(hours);
  minutes = parseInt(minutes);

  if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
  if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

// --- Auth & Profile Controllers ---

const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;
    const doctor = await doctorModel.findOne({ email });

    if (!doctor || !(await bcrypt.compare(password, doctor.password))) {
      return res.json({ success: false, message: "Invalid Credentials" });
    }

    const accessToken = jwt.sign({ id: doctor._id, role: "doctor" }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: doctor._id, role: "doctor" }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });

    doctor.refreshTokens.push(refreshToken);
    await doctor.save();

    res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, role: 'doctor' });
  } catch (error) {
    console.error("Login Error:", error);
    res.json({ success: false, message: error.message });
  }
};

const logoutDoctor = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
        await doctorModel.findByIdAndUpdate(decoded.id, { $pull: { refreshTokens: refreshToken } });
      } catch (err) {}
    }
  } catch (error) {}
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
};

const doctorProfile = async (req, res) => {
  try {
    // Use req.user.id (set by verifyToken) — reliable for both GET and POST routes
    const docId = req.user?.id || req.body.docId;
    const profileData = await doctorModel.findById(docId).select("-password");
    res.json({ success: true, profileData });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

const updateDoctorProfile = async (req, res) => {
  try {
    // Use req.user.id (set by verifyToken) — reliable for both GET and POST routes
    const docId = req.user?.id || req.body.docId;
    const { fees, address, available, about } = req.body;

    await doctorModel.findByIdAndUpdate(docId, { fees, address, available, about });

    res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

const changeAvailability = async (req, res) => {
  try {
    const { docId } = req.body;
    const docData = await doctorModel.findById(docId);
    await doctorModel.findByIdAndUpdate(docId, { available: !docData.available });
    res.json({ success: true, message: "Availability Changed" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

const doctorList = async (req, res) => {
  try {
    const doctors = await doctorModel.find({}).select(["-password", "-email"]);
    res.json({ success: true, doctors });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// --- Dashboard & Appointment Management ---

const doctorDashboard = async (req, res) => {
  try {
    // Use req.user.id (set by verifyToken) — reliable for both GET and POST routes
    const docId = req.user?.id || req.body.docId;
    const appointments = await appointmentModel.find({ docId });

    // Efficiently calculate earnings and unique patients in one pass or using Sets
    const earnings = appointments.reduce((acc, item) => 
      (item.isCompleted || item.payment) ? acc + item.amount : acc, 0
    );
    
    const uniquePatients = new Set(appointments.map(item => item.userId)).size;

    const dashData = {
      earnings,
      appointments: appointments.length,
      patients: uniquePatients,
      latestAppointments: [...appointments].reverse().slice(0, 5),
    };

    res.json({ success: true, dashData });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

const appointmentsDoctor = async (req, res) => {
  try {
    // Use req.user.id (set by verifyToken) — reliable for both GET and POST routes
    const docId = req.user?.id || req.body.docId;
    const appointments = await appointmentModel.find({ docId });
    res.json({ success: true, appointments });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

const appointmentComplete = async (req, res) => {
  try {
    const { docId, appointmentId } = req.body;
    const appointmentData = await appointmentModel.findById(appointmentId);

    // Use String() on both sides: appointmentData.docId is an ObjectId, docId is a string
    if (!appointmentData || String(appointmentData.docId) !== String(docId)) {
      return res.json({ success: false, message: "Invalid Request" });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, {
      isCompleted: true,
      status: "Completed"
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`doctor_${docId}`).emit("appointment-completed", {
        slotTime: appointmentData.slotTime,
        appointmentId
      });
    }

    res.json({ success: true, message: "Appointment Completed" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

const appointmentCancel = async (req, res) => {
  try {
    const { docId, appointmentId } = req.body;
    const appointmentData = await appointmentModel.findById(appointmentId);

    // Use String() on both sides: appointmentData.docId is an ObjectId, docId is a string
    if (!appointmentData || String(appointmentData.docId) !== String(docId)) {
      return res.json({ success: false, message: "Invalid Request" });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });

    const io = req.app.get("io");
    if (io) {
      io.to(`doctor_${docId}`).emit("appointment-cancelled", {
        slotTime: appointmentData.slotTime,
        appointmentId
      });
    }

    res.json({ success: true, message: "Appointment Cancelled" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// --- Live Queue System (High-Throughput Redis Hot-State + BullMQ Write-Behind) ---

const nextPatient = async (req, res) => {
  try {
    const { docId } = req.body;
    const todayStr = getTodayStr();
    const now = new Date();
    const queueKey = `opd:queue:${docId}`;

    // 1. FAST-PATH: Fetch Hot Queue State from Redis RAM
    let cachedQueue = null;
    try {
      cachedQueue = await redis.hgetall(queueKey);
    } catch (e) {
      console.warn("Redis read warning in nextPatient:", e.message);
    }

    let avgConsultationTime = 15;
    let currentSlotTime = "";
    let lastCallTime = null;
    let lastQueueDate = "";

    if (cachedQueue && Object.keys(cachedQueue).length > 0) {
      currentSlotTime = cachedQueue.currentSlotTime || "";
      lastQueueDate = cachedQueue.lastQueueDate || "";
      lastCallTime = cachedQueue.lastCallTime ? new Date(cachedQueue.lastCallTime) : null;
      avgConsultationTime = cachedQueue.avgConsultationTime ? parseInt(cachedQueue.avgConsultationTime) : 15;
    } else {
      // Cold-start fallback: Rehydrate state from MongoDB once
      const doctor = await doctorModel.findById(docId);
      if (!doctor) return res.json({ success: false, message: "Doctor not found" });
      currentSlotTime = doctor.currentSlotTime || "";
      lastQueueDate = doctor.lastQueueDate || "";
      lastCallTime = doctor.lastCallTime;
      avgConsultationTime = doctor.avgConsultationTime || 15;
    }

    // EWMA TCP-Jacobson Style Queue Analytics
    if (lastQueueDate === todayStr && lastCallTime && currentSlotTime) {
      const durationMins = Math.round((now - new Date(lastCallTime)) / 60000);
      if (durationMins >= 1 && durationMins <= 120) {
        const ALPHA = 0.3; // EWMA smoothing factor
        avgConsultationTime = Math.round((ALPHA * durationMins) + ((1 - ALPHA) * avgConsultationTime));
      }
    }

    const currentSlotMinutes = lastQueueDate === todayStr 
      ? parseSlotMinutes(currentSlotTime) 
      : -1;

    // Retrieve today's pending appointments
    const pendingAppts = await appointmentModel.find({
      docId,
      slotDate: todayStr,
      cancelled: false,
      isCompleted: false,
      status: { $nin: ["Skipped", "Absent", "Completed"] }
    });

    const nextAppt = pendingAppts
      .sort((a, b) => parseSlotMinutes(a.slotTime) - parseSlotMinutes(b.slotTime))
      .find(appt => parseSlotMinutes(appt.slotTime) > currentSlotMinutes);

    if (!nextAppt) {
      return res.json({ success: false, message: "No more pending patients for today." });
    }

    // 2. FAST PATH: Update Redis In-Memory State (sub-millisecond)
    try {
      await redis.hset(queueKey, {
        currentSlotTime: nextAppt.slotTime,
        lastQueueDate: todayStr,
        lastUpdate: now.toISOString(),
        lastCallTime: now.toISOString(),
        avgConsultationTime: String(avgConsultationTime),
        opdActive: "false"
      });
      await redis.expire(queueKey, 86400); // 24-hr TTL
    } catch (e) {
      console.warn("Redis write warning in nextPatient:", e.message);
    }

    // 3. FAST PATH: Instant Real-time WebSocket Broadcast
    const io = req.app.get("io");
    if (io) {
      io.to(`doctor_${docId}`).emit("queue-update", {
        currentSlotTime: nextAppt.slotTime,
        lastUpdate: now,
        avgTime: avgConsultationTime,
        opdActive: false
      });
      io.to("admin_global_queue_room").emit("global-queue-update", {
        docId,
        currentSlotTime: nextAppt.slotTime,
        lastUpdate: now,
        avgTime: avgConsultationTime,
        opdActive: false
      });
    }

    // 4. SLOW PATH: Write-Behind Persistence via BullMQ (decoupled from HTTP critical path)
    await enqueueOpdSync({
      type: "UPDATE_DOCTOR_QUEUE",
      docId,
      updateData: {
        currentSlotTime: nextAppt.slotTime,
        lastQueueDate: todayStr,
        lastUpdate: now,
        lastCallTime: now,
        avgConsultationTime,
        opdActive: false
      }
    });

    // 5. Instant HTTP 200 Response to Doctor UI
    res.json({ 
      success: true, 
      message: `Calling patient for ${nextAppt.slotTime}`, 
      currentSlotTime: nextAppt.slotTime, 
      avgConsultationTime 
    });

  } catch (error) {
    console.error("nextPatient error:", error);
    res.json({ success: false, message: error.message });
  }
};

const markAbsent = async (req, res) => {
  try {
    const { docId, appointmentId } = req.body;
    const todayStr = getTodayStr();
    const queueKey = `opd:queue:${docId}`;

    const updatedAppt = await appointmentModel.findOneAndUpdate(
      { _id: appointmentId, docId, slotDate: todayStr },
      { status: "Absent" },
      { new: true }
    );

    if (!updatedAppt) return res.json({ success: false, message: "Appointment not found" });

    // Fetch current doctor slot from Redis or DB
    let currentSlotTime = "";
    try {
      currentSlotTime = await redis.hget(queueKey, "currentSlotTime");
    } catch (e) {}
    if (!currentSlotTime) {
      const doctor = await doctorModel.findById(docId);
      currentSlotTime = doctor?.currentSlotTime || "";
    }

    let nextSlotTime = currentSlotTime;
    let queueUpdated = false;

    if (currentSlotTime === updatedAppt.slotTime) {
      const pendingAppts = await appointmentModel.find({
        docId,
        slotDate: todayStr,
        cancelled: false,
        isCompleted: false,
        status: { $nin: ["Absent", "Skipped", "Completed"] }
      });

      const currentMinutes = parseSlotMinutes(currentSlotTime);
      const nextPatient = pendingAppts
        .sort((a, b) => parseSlotMinutes(a.slotTime) - parseSlotMinutes(b.slotTime))
        .find(appt => parseSlotMinutes(appt.slotTime) > currentMinutes);

      if (nextPatient) {
        nextSlotTime = nextPatient.slotTime;
        queueUpdated = true;

        // Fast-path Redis update
        try {
          await redis.hset(queueKey, {
            currentSlotTime: nextSlotTime,
            lastUpdate: new Date().toISOString()
          });
        } catch (e) {}

        // Enqueue Write-Behind persistence to MongoDB
        await enqueueOpdSync({
          type: "UPDATE_DOCTOR_QUEUE",
          docId,
          updateData: {
            currentSlotTime: nextSlotTime,
            lastUpdate: new Date()
          }
        });
      }
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`doctor_${docId}`).emit("patient-skipped", {
        skippedSlotTime: updatedAppt.slotTime,
        status: "Absent"
      });
      if (queueUpdated) {
        io.to(`doctor_${docId}`).emit("queue-update", {
          currentSlotTime: nextSlotTime,
          lastUpdate: new Date(),
        });
        io.to("admin_global_queue_room").emit("global-queue-update", {
          docId,
          currentSlotTime: nextSlotTime,
          lastUpdate: new Date(),
        });
      }
    }

    res.json({ success: true, message: queueUpdated ? "Marked Absent. Calling next patient." : "Patient marked absent." });
  } catch (error) {
    console.error("markAbsent error:", error);
    res.json({ success: false, message: error.message });
  }
};

const resetQueue = async (req, res) => {
  try {
    const { docId } = req.body;
    const queueKey = `opd:queue:${docId}`;

    // Fast-path Redis update
    try {
      await redis.hset(queueKey, "currentSlotTime", "");
    } catch (e) {}

    const io = req.app.get("io");
    if (io) {
      io.to(`doctor_${docId}`).emit("queue-update", { currentSlotTime: "" });
      io.to("admin_global_queue_room").emit("global-queue-update", { docId, currentSlotTime: "" });
    }

    // Write-behind persistence via BullMQ
    await enqueueOpdSync({
      type: "RESET_QUEUE",
      docId
    });

    res.json({ success: true, message: "Queue Reset" });
  } catch (error) {
    console.error("resetQueue error:", error);
    res.json({ success: false, message: error.message });
  }
};

const getDoctorStatus = async (req, res) => {
  try {
    const { docId } = req.body;
    const todayStr = getTodayStr();
    const queueKey = `opd:queue:${docId}`;

    // Fast-path read from Redis RAM (0.5ms)
    try {
      const cachedQueue = await redis.hgetall(queueKey);
      if (cachedQueue && cachedQueue.lastQueueDate === todayStr) {
        const isToday = true;
        const currentSlotTime = cachedQueue.currentSlotTime || "";
        const opdActive = cachedQueue.opdActive === "true";
        const opdStartTime = cachedQueue.opdStartTime ? new Date(cachedQueue.opdStartTime) : null;
        const dynamicTime = cachedQueue.avgConsultationTime ? parseInt(cachedQueue.avgConsultationTime) : 15;
        const timeElapsed = cachedQueue.lastCallTime 
          ? Math.round((new Date() - new Date(cachedQueue.lastCallTime)) / 60000) 
          : 0;

        return res.json({
          success: true,
          currentSlotTime,
          opdActive,
          opdStartTime,
          timePerVisit: dynamicTime,
          avgConsultationTime: dynamicTime,
          lastUpdate: cachedQueue.lastUpdate ? new Date(cachedQueue.lastUpdate) : new Date(),
          timeElapsed,
          usingLiveAvg: true,
          cached: true
        });
      }
    } catch (e) {
      console.warn("Redis read warning in getDoctorStatus:", e.message);
    }

    // Cache miss: Fall back to MongoDB & hydrate Redis
    const doctor = await doctorModel.findById(docId)
      .select(["currentSlotTime", "lastQueueDate", "lastUpdate", "avgConsultationTime", "consultationTimes", "lastCallTime", "opdActive", "opdStartTime"]);

    if (!doctor) return res.json({ success: false, message: "Doctor not found" });

    const isToday = doctor.lastQueueDate === todayStr;
    const currentSlotTime = isToday ? (doctor.currentSlotTime || "") : "";
    const opdActive = isToday ? (doctor.opdActive || false) : false;
    
    let dynamicTime = doctor.avgConsultationTime || 15;

    const timeElapsed = (isToday && doctor.lastCallTime) 
      ? Math.round((new Date() - new Date(doctor.lastCallTime)) / 60000) 
      : 0;

    // Hydrate Redis cache for all subsequent patient reads
    try {
      await redis.hset(queueKey, {
        currentSlotTime,
        lastQueueDate: doctor.lastQueueDate || "",
        lastUpdate: (doctor.lastUpdate || new Date()).toISOString(),
        lastCallTime: doctor.lastCallTime ? new Date(doctor.lastCallTime).toISOString() : "",
        avgConsultationTime: String(dynamicTime),
        opdActive: String(opdActive),
        opdStartTime: doctor.opdStartTime ? new Date(doctor.opdStartTime).toISOString() : ""
      });
      await redis.expire(queueKey, 86400);
    } catch (e) {}

    res.json({
      success: true,
      currentSlotTime,
      opdActive,
      opdStartTime: isToday ? doctor.opdStartTime : null,
      timePerVisit: dynamicTime,
      avgConsultationTime: dynamicTime,
      lastUpdate: doctor.lastUpdate,
      timeElapsed,
      usingLiveAvg: true
    });
  } catch (error) {
    console.error("getDoctorStatus error:", error);
    res.json({ success: false, message: error.message });
  }
};

const startOPD = async (req, res) => {
  try {
    const { docId } = req.body;
    const todayStr = getTodayStr();
    const now = new Date();
    const queueKey = `opd:queue:${docId}`;

    // Fast-path Redis update
    try {
      await redis.hset(queueKey, {
        opdActive: "true",
        opdStartTime: now.toISOString(),
        lastQueueDate: todayStr
      });
      await redis.expire(queueKey, 86400);
    } catch (e) {}

    // Emit socket event to notify all patients immediately
    const io = req.app.get("io");
    if (io) {
      io.to("doctor_" + docId).emit("opd-started", {
        opdActive: true,
        opdStartTime: now
      });
      io.to("admin_global_queue_room").emit("global-queue-update", {
        docId,
        opdActive: true,
        opdStartTime: now
      });
    }

    // Write-behind persistence via BullMQ
    await enqueueOpdSync({
      type: "START_OPD",
      docId,
      updateData: {
        opdActive: true,
        opdStartTime: now,
        lastQueueDate: todayStr
      }
    });

    res.json({ success: true, message: "Emergency operation active. Patients have been notified." });

  } catch (error) {
    console.error("startOPD error:", error);
    res.json({ success: false, message: error.message });
  }
};

export {
  changeAvailability,
  doctorList,
  loginDoctor,
  logoutDoctor,
  appointmentsDoctor,
  appointmentCancel,
  appointmentComplete,
  doctorDashboard,
  doctorProfile,
  updateDoctorProfile,
  nextPatient,
  markAbsent,
  resetQueue,
  getDoctorStatus,
  startOPD,
};