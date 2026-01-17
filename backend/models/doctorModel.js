import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    speciality: {
      type: String,
      required: true,
    },
    degree: {
      type: String,
      required: true,
    },
    experience: {
      type: String,
      required: true,
    },
    about: {
      type: String,
      required: true,
    },
    available: {
      type: Boolean,
      default: true,
    },
    fees: {
      type: Number,
      required: true,
    },
    address: {
      type: Object,
      required: true,
    },
    date: {
      type: Number,
      required: true,
    },
    currentSlotTime: {
      type: String,
      default: ""  // The slot time currently being served (e.g., "12:00 PM")
    },
    lastQueueDate: { 
        type: String, 
        default: "" 
    },
    lastUpdate: {
        type: Date,
        default: null
    },
    lastCallTime: {
        type: Date,
        default: null  // When the current token was called
    },
    consultationTimes: {
        type: [Number],  // Array of recent consultation durations in minutes
        default: []
    },
    avgConsultationTime: {
        type: Number,
        default: 15  // Rolling average, starts with default
    },
    slots_booked: {
      type: Object,
      default: {},
    },
  },
  { minimize: false }
); //Setting { minimize: false } ensures that empty objects are stored instead of being removed. In this case, even if slots_booked is empty, it will be saved as {} in the database.

const doctorModel =
  mongoose.models.doctor || mongoose.model("doctor", doctorSchema);

export default doctorModel;