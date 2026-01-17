import express from 'express';
import { getChatHistory, saveChatMessage, deleteChatHistory } from '../controllers/chatController.js';
import authUser from '../middlewares/authUser.js';

const chatRouter = express.Router();

// Route to load chat history
// Matches Frontend: axios.post('/api/chat/get', ...)
chatRouter.post('/get', authUser, getChatHistory);

// Route to save a new message
// Matches Frontend: axios.post('/api/chat/save', ...)
chatRouter.post('/save', authUser, saveChatMessage);

// Route to delete/reset chat history
// Matches Frontend: axios.delete('/api/chat/delete', ...)
chatRouter.delete('/delete', authUser, deleteChatHistory);

export default chatRouter;