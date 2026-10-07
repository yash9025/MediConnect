import validator from "validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import razorpay from "razorpay";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import mongoose from "mongoose";
import { enqueueBooking } from "../workers/bookingQueue.js";
import { enqueuePaymentVerification } from "../workers/paymentQueue.js";
import { connection as redisClient } from "../config/redis.js";

// Helper to standardise date format DD_MM_YYYY
const getTodayDateStr = () => {
  const today = new Date();
  return `${String(today.getDate()).padStart(2, "0")}_${String(today.getMonth() + 1).padStart(2, "0")}_${today.getFullYear()}`;
};

// --- Authentication Controllers ---

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.json({ success: false, message: "Missing Details" });
    }

    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Invalid Email" });
    }

    if (password.length < 8) {
      return res.json({ success: false, message: "Password must be at least 8 characters" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new userModel({ name, email, password: hashedPassword });
    const user = await newUser.save();

    const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });

    user.refreshTokens.push(refreshToken);
    await user.save();

      res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 15 * 60 * 1000 });
      res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, role: user.role });

  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "Invalid Credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });

      user.refreshTokens.push(refreshToken);
      await user.save();

      res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 15 * 60 * 1000 });
      res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.json({ success: true, role: user.role });
    } else {
      res.json({ success: false, message: "Invalid Credentials" });
    }
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

const logoutUser = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    // We get the user ID from the access token middleware if possible. Wait, logout doesn't have verifyToken middleware!
    // Let's decode the refresh token to find the user id if userId isn't in req.
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
        await userModel.findByIdAndUpdate(decoded.id, { $pull: { refreshTokens: refreshToken } });
      } catch (err) {
        // invalid token, just clear cookies
      }
    }
  } catch (error) {
    console.error(error);
  }
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
};

// --- Profile Management ---

const getProfile = async (req, res) => {
  try {
    const userData = await userModel.findById(req.userId).select("-password");
    res.json({ success: true, userData });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { userId, name, phone, address, dob, gender } = req.body;
    const imageFile = req.file;

    if (!name || !phone || !dob || !gender) {
      return res.json({ success: false, message: "Data Missing" });
    }

    const updateData = {
      name,
      phone,
      address: JSON.parse(address),
      dob,
      gender,
    };

    if (imageFile) {
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" });
      updateData.image = imageUpload.secure_url;
    }

    await userModel.findByIdAndUpdate(userId, updateData);
    res.json({ success: true, message: "Profile Updated" });

  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// --- Appointment Logic ---

const bookAppointment = async (req, res) => {
  const { docId, slotDate, slotTime } = req.body;
  const userId = req.userId;
  const lockKey = `lock:${docId}:${slotDate}:${slotTime}`;
  const bookingId = new mongoose.Types.ObjectId();

  try {
    // 1. Atomic Lua Script for Slot Reservation (Phase 2 Fast Path)
    // This executes atomically within Redis, eliminating Check-and-Set race conditions.
    const reserveSlotLua = `
      local key = KEYS[1]
      local uid = ARGV[1]
      local ttl = ARGV[2]
      if redis.call("EXISTS", key) == 1 then
        return 0
      else
        redis.call("SET", key, uid, "PX", ttl)
        return 1
      end
    `;

    // Execute script: 1 key (lockKey), 2 args (userId, 60000ms TTL)
    const result = await redisClient.eval(reserveSlotLua, 1, lockKey, userId, 60000);

    if (result === 0) {
      return res.status(409).json({ 
        success: false, 
        message: "Slot is currently being processed by another patient. Please try again or select another slot." 
      });
    }

    // 2. Enqueue Job for Asynchronous Persistence (Phase 3 Handoff)
    // Send minimal payload to BullMQ. The worker will handle DB reads/writes.
    const jobPayload = {
      _id: bookingId, // Pass as _id for consistency with old code
      bookingId,
      docId,
      slotDate,
      slotTime,
      userId,
      date: Date.now(),
      status: "pending"
    };

    await enqueueBooking(jobPayload);

    // 3. Return 202 Accepted Instantly
    // Client receives response in <30ms, Express event loop is freed.
    return res.status(202).json({ 
      success: true, 
      message: "Booking request accepted and is being processed.", 
      bookingId,
      status: "pending"
    });

  } catch (error) {
    console.error("Booking Edge Error:", error);
    // Best effort lock cleanup in case of catastrophic queue failure
    await redisClient.del(lockKey).catch(() => {}); 
    res.status(500).json({ success: false, message: "Internal server error during booking." });
  }
};

const listAppointment = async (req, res) => {
  try {
    const appointments = await appointmentModel.find({ userId: req.userId });
    res.json({ success: true, appointments });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const userId = req.userId;

    const appointmentData = await appointmentModel.findById(appointmentId);

    // Security check: ensure user owns the appointment
    if (String(appointmentData.userId) !== String(userId)) {
      return res.json({ success: false, message: "Unauthorized action" });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, {
      cancelled: true,
      status: "Cancelled"
    });

    // Release the slot back to the doctor
    const { docId, slotDate, slotTime } = appointmentData;
    const doctorData = await doctorModel.findById(docId);

    if (doctorData.slots_booked && doctorData.slots_booked[slotDate]) {
      doctorData.slots_booked[slotDate] = doctorData.slots_booked[slotDate].filter(e => e !== slotTime);
      
      // Mongoose requires explicit notification for mixed type changes
      doctorData.markModified('slots_booked');
      await doctorData.save();
    }

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

const getAppointmentStatus = async (req, res) => {
  try {
    const { docId, mySlotTime } = req.body;
    const slotDate = getTodayDateStr();

    const appointment = await appointmentModel.findOne({ 
      docId, 
      slotTime: mySlotTime, 
      slotDate 
    });

    if (appointment) {
      return res.json({ 
        success: true, 
        status: appointment.status, 
        isCompleted: appointment.isCompleted, 
        cancelled: appointment.cancelled 
      });
    }

    res.json({ success: false, message: "Appointment not found" });

  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// --- Payment Integration ---

const razorpayInstance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const paymentRazorpay = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const appointmentData = await appointmentModel.findById(appointmentId);

    if (!appointmentData || appointmentData.cancelled) {
      return res.json({ success: false, message: "Appointment Cancelled or Invalid" });
    }

    const options = {
      amount: appointmentData.amount * 100,
      currency: process.env.CURRENCY,
      receipt: appointmentId,
    };

    const order = await razorpayInstance.orders.create(options);
    res.json({ success: true, order });

  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

const verifyRazorpay = async (req, res) => {
  try {
    const { razorpay_order_id } = req.body;
    
    // Push to payment queue
    await enqueuePaymentVerification({ razorpay_order_id });

    res.json({ success: true, message: "Payment Verification Initiated" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

export {
  registerUser,
  loginUser,
  logoutUser,
  getProfile,
  updateProfile,
  bookAppointment,
  listAppointment,
  cancelAppointment,
  paymentRazorpay,
  verifyRazorpay,
  getAppointmentStatus
};