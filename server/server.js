const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Global CORS middleware - most permissive settings
app.use((req, res, next) => {
  res.type('application/json');
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-tenant-id');
  res.header('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(cors({
  origin: function (origin, callback) {
    callback(null, true);
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'Accept']
}));

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
  },
  transports: ['websocket', 'polling']
});

// Store io in app for access in controllers
app.set('io', io);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-restaurant', (tenantId) => {
    socket.join(tenantId);
    console.log(`User joined restaurant room: ${tenantId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const prisma = new PrismaClient();

// Import logger middleware
const loggerMiddleware = require('./src/middleware/loggerMiddleware');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Apply logger middleware AFTER body parser but BEFORE routes
app.use(loggerMiddleware);

// Socket.io initialization
require('./src/socket/socketHandler')(io);

// Routes
app.use('/api/v1/auth', require('./src/routes/authRoutes'));
app.use('/api/v1/users', require('./src/routes/userRoutes'));
app.use('/api/v1/restaurants', require('./src/routes/restaurantRoutes'));
app.use('/api/v1/tables', require('./src/routes/tableRoutes'));
app.use('/api/v1/bookings', require('./src/routes/bookingRoutes'));
app.use('/api/v1/menu', require('./src/routes/menuRoutes'));
app.use('/api/v1/orders', require('./src/routes/orderRoutes'));
app.use('/api/v1/plans', require('./src/routes/planRoutes'));
app.use('/api/v1/analytics', require('./src/routes/analyticsRoutes'));
app.use('/api/v1/staff', require('./src/routes/staffRoutes'));

// Root route
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Restaurant Table Booking API is running' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const errorEmoji = '💥';
  
  console.error(`
╔════════════════════════════════════════════════════════════╗
${errorEmoji} ERROR CAUGHT
📍 ${req.method} ${req.path}
🕐 ${new Date().toLocaleTimeString()}
╠════════════════════════════════════════════════════════════╝
`);

  console.error('❌ ERROR MESSAGE:', err.message);
  console.error('🔍 ERROR CODE:', err.code);
  console.error('📦 ERROR TYPE:', err.constructor.name);
  
  if (err.stack) {
    console.error('📚 STACK:', err.stack);
  }

  if (err.meta) {
    console.error('Meta Info:', err.meta);
  }

  console.error(`
╚════════════════════════════════════════════════════════════╝
`);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    errorCode: err.code,
    statusCode: err.status || 500
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
