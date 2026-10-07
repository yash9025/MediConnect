import express from 'express';
import { requestDataErasure } from '../controllers/privacyController.js';
import { verifyToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const privacyRouter = express.Router();

privacyRouter.delete('/erasure', verifyToken, authorizeRoles('patient'), requestDataErasure);

export default privacyRouter;
