import mongoose from "mongoose";

const queueChatSchema = new mongoose.Schema({
    docId: { type: String, required: true },
    userId: { type: String, required: true },
    appointmentId: { type: String, required: true },
    sender: { type: String, enum: ["Patient", "Doctor"], required: true },
    message: { type: String, required: true },
    senderName: { type: String },
    tokenNumber: { type: Number },
    // TTL index: Delete documents 24 hours (86400 seconds) after creation
    createdAt: { type: Date, default: Date.now, index: { expires: 86400 } }
});

const queueChatModel = mongoose.models.queuechat || mongoose.model("queuechat", queueChatSchema);
export default queueChatModel;
