import express from 'express';
import { getChatHistory, saveChatMessage, deleteChatHistory } from '../controllers/chatController.js';
import authUser from '../middlewares/authUser.js';

const chatRouter = express.Router();
chatRouter.post('/get', authUser, getChatHistory);

// Route to save a new message
chatRouter.post('/save', authUser, saveChatMessage);

// Route to delete/reset chat history
chatRouter.delete('/delete', authUser, deleteChatHistory);

export default chatRouter;