import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  history: [
    {
      type: { type: String, enum: ['user', 'bot'], required: true },
      text: { type: String },
      fileName: { type: String }, // If they uploaded a file
      isReport: { type: Boolean, default: false }, // To trigger your custom component
      data: { type: Object } // To store the AI Analysis JSON
    }
  ],
  lastUpdated: { type: Date, default: Date.now }
});

const chatModel = mongoose.models.chat || mongoose.model("chat", chatSchema);
export default chatModel;