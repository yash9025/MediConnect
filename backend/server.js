import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/mongodb.js'; //mongodb.js file ko import kia hai
import connectCloudinary from './config/cloudinary.js';
import adminRouter from './routes/adminRoute.js';
import doctorRouter from './routes/doctorRoute.js';
import userRouter from './routes/userRoute.js';

//app config
const app = express(); //app varaible me define krdiya ab express ke sare function app. se use krsakte hai
const port = process.env.PORT || 4000;
connectDB();
connectCloudinary();

// middlewares
app.use(express.json()); //express.json() is used to parse the json data from the request body(jab frontend se data eyga toh server usko smjhe or handle krpaye isliye we use this or wo req.body me store hojayega)
app.use(cors()); //cors is used to allow the request from different origin(jaise ki me jo login krrha hu frontend pe toh mera frintend koyi or server pe hai or backend koyi or pe toh browser us login data ki info backend me nhi ane dega isliye cors use krte hai)

// api endpoints
app.use('/api/admin' , adminRouter); ////localhost:4000/api/admin/add-doctor
app.use('/api/doctor' , doctorRouter);
app.use('/api/user' , userRouter);

app.get('/', (req, res) => res.send('Api Working')); //get request pe '/' pe jake hello world print krega
app.get('/ping', (req, res) => {
  console.log(`[${new Date().toISOString()}] Ping received`);
  res.status(200).send('pong');
});

app.listen(port, () => console.log(`Listening on localhost:${port}`)); //port pe server start hoga or console me print hoga ki server start hua hai
