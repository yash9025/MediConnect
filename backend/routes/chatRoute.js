import express from 'express';
import { getChatHistory, saveChatMessage, deleteChatHistory } from '../controllers/chatController.js';
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const chatRouter = express.Router();
chatRouter.post('/get', verifyToken, authorizeRoles('patient'), getChatHistory);

// Route to save a new message
chatRouter.post('/save', verifyToken, authorizeRoles('patient'), saveChatMessage);

// Route to delete/reset chat history
chatRouter.delete('/delete', verifyToken, authorizeRoles('patient'), deleteChatHistory);

export default chatRouter;