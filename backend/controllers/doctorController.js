import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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

    const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET);
    res.json({ success: true, token });
  } catch (error) {
    console.error("Login Error:", error);
    res.json({ success: false, message: error.message });
  }
};

const doctorProfile = async (req, res) => {
  try {
    const { docId } = req.body;
    const profileData = await doctorModel.findById(docId).select("-password");
    res.json({ success: true, profileData });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

const updateDoctorProfile = async (req, res) => {
  try {
    const { docId, fees, address, available } = req.body;
    await doctorModel.findByIdAndUpdate(docId, { fees, address, available });
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
    const { docId } = req.body;
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
    const { docId } = req.body;
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

    if (!appointmentData || appointmentData.docId !== docId) {
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

    if (!appointmentData || appointmentData.docId !== docId) {
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

// --- Live Queue System ---

const nextPatient = async (req, res) => {
  try {
    const { docId } = req.body;
    const todayStr = getTodayStr();
    const now = new Date();
    
    const doctor = await doctorModel.findById(docId);
    if (!doctor) return res.json({ success: false, message: "Doctor not found" });

    // 1. Calculate & Update Consultation Analytics
    // Rolling average of last 10 visits to predict wait times dynamically
    let { consultationTimes = [], avgConsultationTime = 15 } = doctor;

    if (doctor.lastQueueDate === todayStr && doctor.lastCallTime && doctor.currentSlotTime) {
      const durationMins = Math.round((now - new Date(doctor.lastCallTime)) / 60000);
      
      if (durationMins >= 1 && durationMins <= 120) {
        consultationTimes = [...consultationTimes, durationMins].slice(-10); // Keep last 10
        
        const recentStats = consultationTimes.slice(-3);
        avgConsultationTime = Math.round(recentStats.reduce((a, b) => a + b, 0) / recentStats.length);
      }
    }

    // 2. Determine Next Patient
    const currentSlotMinutes = doctor.lastQueueDate === todayStr 
      ? parseSlotMinutes(doctor.currentSlotTime) 
      : -1;

    const pendingAppts = await appointmentModel.find({
      docId,
      slotDate: todayStr,
      cancelled: false,
      isCompleted: false,
      status: { $nin: ["Skipped", "Absent", "Completed"] }
    });

    // Sort by time and find first slot after current
    const nextAppt = pendingAppts
      .sort((a, b) => parseSlotMinutes(a.slotTime) - parseSlotMinutes(b.slotTime))
      .find(appt => parseSlotMinutes(appt.slotTime) > currentSlotMinutes);

    if (!nextAppt) {
      return res.json({ success: false, message: "No more pending patients for today." });
    }

    // 3. Update State & Broadcast
    await doctorModel.findByIdAndUpdate(docId, {
      currentSlotTime: nextAppt.slotTime,
      lastQueueDate: todayStr,
      lastUpdate: now,
      lastCallTime: now,
      consultationTimes,
      avgConsultationTime
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`doctor_${docId}`).emit("queue-update", {
        currentSlotTime: nextAppt.slotTime,
        lastUpdate: now,
        avgTime: avgConsultationTime
      });
    }

    res.json({ 
      success: true, 
      message: `Calling patient for ${nextAppt.slotTime}`, 
      currentSlotTime: nextAppt.slotTime, 
      avgConsultationTime 
    });

  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};



const markAbsent = async (req, res) => {
  try {
    const { docId, appointmentId } = req.body;
    const todayStr = getTodayStr();

    const updatedAppt = await appointmentModel.findOneAndUpdate(
      { _id: appointmentId, docId, slotDate: todayStr },
      { status: "Absent" },
      { new: true }
    );

    if (!updatedAppt) return res.json({ success: false, message: "Appointment not found" });

    // Auto-advance queue if the absent patient was currently active
    const doctor = await doctorModel.findById(docId);
    let nextSlotTime = doctor.currentSlotTime;
    let queueUpdated = false;

    if (doctor.currentSlotTime === updatedAppt.slotTime) {
      const pendingAppts = await appointmentModel.find({
        docId,
        slotDate: todayStr,
        cancelled: false,
        isCompleted: false,
        status: { $nin: ["Absent", "Skipped", "Completed"] }
      });

      const currentMinutes = parseSlotMinutes(doctor.currentSlotTime);
      const nextPatient = pendingAppts
        .sort((a, b) => parseSlotMinutes(a.slotTime) - parseSlotMinutes(b.slotTime))
        .find(appt => parseSlotMinutes(appt.slotTime) > currentMinutes);

      if (nextPatient) {
        nextSlotTime = nextPatient.slotTime;
        queueUpdated = true;
        await doctorModel.findByIdAndUpdate(docId, {
          currentSlotTime: nextSlotTime,
          lastUpdate: new Date()
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
      }
    }

    res.json({ success: true, message: queueUpdated ? "Marked Absent. Calling next patient." : "Patient marked absent." });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

const resetQueue = async (req, res) => {
  try {
    const { docId } = req.body;
    await doctorModel.findByIdAndUpdate(docId, { currentSlotTime: "" });

    const io = req.app.get("io");
    if (io) io.to(`doctor_${docId}`).emit("queue-update", { currentSlotTime: "" });

    res.json({ success: true, message: "Queue Reset" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

const getDoctorStatus = async (req, res) => {
  try {
    const { docId } = req.body;
    const todayStr = getTodayStr();
    
    const doctor = await doctorModel.findById(docId)
      .select(["currentSlotTime", "lastQueueDate", "lastUpdate", "avgConsultationTime", "consultationTimes", "lastCallTime"]);

    if (!doctor) return res.json({ success: false, message: "Doctor not found" });

    // Reset data if it's a new day
    const isToday = doctor.lastQueueDate === todayStr;
    const currentSlotTime = isToday ? (doctor.currentSlotTime || "") : "";
    
    // Dynamic avg calculation (fallback to 15 if no history)
    const history = doctor.consultationTimes || [];
    let dynamicTime = 15;
    if (history.length > 0) {
      const recent = history.slice(-3);
      dynamicTime = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
    }

    const timeElapsed = (isToday && doctor.lastCallTime) 
      ? Math.round((new Date() - new Date(doctor.lastCallTime)) / 60000) 
      : 0;

    res.json({
      success: true,
      currentSlotTime,
      timePerVisit: dynamicTime,
      avgConsultationTime: dynamicTime,
      lastUpdate: doctor.lastUpdate,
      timeElapsed,
      consultationHistory: history,
      usingLast3: history.length > 0
    });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

export {
  changeAvailability,
  doctorList,
  loginDoctor,
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
};