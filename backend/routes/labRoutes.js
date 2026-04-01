import express from 'express';
import { analyzeReport } from '../controllers/labController.js';
import upload from '../middlewares/multer.js';
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const labRouter = express.Router();

// Keep upload first so file parsing runs before role-gated analysis logic.
labRouter.post('/analyze', upload.single('pdf'), verifyToken, authorizeRoles('patient'), analyzeReport);

export default labRouter;