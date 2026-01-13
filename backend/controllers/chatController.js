import chatModel from "../models/chatModel.js";

// 1. Get Chat History
export const getChatHistory = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        const chat = await chatModel.findOne({ userId });
        
        // Return existing history or an empty array if no chat exists yet
        res.json({ success: true, history: chat ? chat.history : [] });

    } catch (error) {
        console.error("Get History Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Save New Message (Call this every time user/bot sends msg)
export const saveChatMessage = async (req, res) => {
    try {
        const { userId, message } = req.body;

        if (!userId || !message) {
            return res.status(400).json({ success: false, message: "User ID and Message are required" });
        }

        let chat = await chatModel.findOne({ userId });

        if (!chat) {
            // Create new chat document if it doesn't exist
            chat = new chatModel({ 
                userId, 
                history: [message],
                lastUpdated: Date.now()
            });
        } else {
            // Append to existing history
            chat.history.push(message);
            chat.lastUpdated = Date.now();
        }

        await chat.save();
        res.json({ success: true, message: "Message saved successfully" });

    } catch (error) {
        console.error("Save Message Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};