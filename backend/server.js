import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/mongodb.js';
import connectCloudinary from './config/cloudinary.js';
import adminRouter from './routes/adminRoute.js';
import doctorRouter from './routes/doctorRoute.js';
import userRouter from './routes/userRoute.js';

const app = express();
const port = process.env.PORT || 4000;

// Connect DB and Cloudinary
connectDB();
connectCloudinary();

// Middleware
app.use(express.json());

// CORS configuration
const allowedOrigins = [
  "https://mediconnect-treo.onrender.com"
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// API routes
app.use('/api/admin', adminRouter);
app.use('/api/doctor', doctorRouter);
app.use('/api/user', userRouter);

// Test routes
app.get('/', (req, res) => res.send('API Working'));
app.get('/ping', (req, res) => {
  console.log(`[${new Date().toISOString()}] Ping received`);
  res.status(200).send('pong');
});

// Start server
app.listen(port, () => console.log(`Listening on port ${port}`));
