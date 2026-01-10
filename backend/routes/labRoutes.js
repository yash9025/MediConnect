import express from 'express';
import { analyzeReport } from '../controllers/labController.js';
import upload from '../middlewares/multer.js';
import authUser from '../middlewares/authUser.js';

const labRouter = express.Router();

// FIX: Put 'upload' FIRST, then 'authUser'
labRouter.post('/analyze', upload.single('pdf'), authUser, analyzeReport);

export default labRouter;