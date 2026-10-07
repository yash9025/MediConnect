import mongoose from "mongoose";

const queueChatSchema = new mongoose.Schema({
    docId: { type: String, required: true },
    userId: { type: String, required: true },
    appointmentId: { type: String, required: true },
    sender: { type: String, enum: ["Patient", "Doctor"], required: true },
    message: { type: String, required: true },
    senderName: { type: String },
    tokenNumber: { type: Number },
    reaction: { type: String, default: null },
    // TTL: Auto-delete 3 days after appointment date so DB doesn't bulk up with stale chat logs
    expireAt: { type: Date, index: { expires: 0 } }
});

const queueChatModel = mongoose.models.queuechat || mongoose.model("queuechat", queueChatSchema);
export default queueChatModel;
