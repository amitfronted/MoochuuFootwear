import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import connectDb from './config/connectDb.js';
import userRouter from './routes/user.route.js';
import addressRouter from './routes/address.route.js';
import baseRouter from './routes/base.route.js';
import strapRouter from './routes/strap.routes.js';
import productRouter from './routes/product.route.js';
import thumbRouter from './routes/thumb.routes.js';
import uploadRouter from './routes/upload.route.js';
import cartRouter from './routes/cart.route.js';
import orderRouter from './routes/order.routes.js';
import notificationRouter from './routes/notification.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';
import inventoryRouter from './routes/inventory.routes.js';
import { razorpayWebhookController } from './controllers/razorpayWebhook.controller.js';

const app = express();
const PORT = process.env.PORT || 7000;

const whitelist = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.use(
  '/api/orders/razorpay/webhook',
  express.raw({ type: 'application/json' }),
  razorpayWebhookController,
);

app.use(express.json());
app.use(cookieParser());

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);

app.get('/', (request, response) => {
  response.json({
    message: 'Server is runing ',
    port: PORT,
  });
});

app.use('/api/user', userRouter);
app.use('/api/address', addressRouter);
app.use('/api/base', baseRouter);
app.use('/api/strap', strapRouter);
app.use('/api/thumb', thumbRouter);
app.use('/api/products', productRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/inventory', inventoryRouter);

connectDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});
