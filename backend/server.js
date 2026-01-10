import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/mongodb.js';
import connectCloudinary from './config/cloudinary.js';
import adminRouter from './routes/adminRoute.js';
import doctorRouter from './routes/doctorRoute.js';
import userRouter from './routes/userRoute.js';
import labRoutes from  './routes/labRoutes.js'
import chatRouter from './routes/chatRoute.js';

const app = express();
const port = process.env.PORT || 4000;

// Connect DB and Cloudinary
connectDB();
connectCloudinary();

// Middleware
app.use(express.json());

//  Enable CORS globally for all routes
app.use(cors()); // no options = allow all origins

// API routes
app.use('/api/admin', adminRouter);
app.use('/api/doctor', doctorRouter);
app.use('/api/user', userRouter);
app.use('/api/lab' , labRoutes);
app.use('/api/chat', chatRouter);


// Test routes
app.get('/', (req, res) => res.send('API Working'));
app.get('/ping', (req, res) => {
  console.log(`[${new Date().toISOString()}] Ping received`);
  res.status(200).send('pong');
});

// Start server
app.listen(port, () => console.log(`Listening on port ${port}`));
