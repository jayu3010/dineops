const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { MongoClient } = require('mongodb');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');
const prisma = new PrismaClient();

exports.register = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db('petpooja-copy');

    const { name, email, password, role } = req.body;

    const existingUser = await db.collection('User').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === 'ADMIN' ? 'ADMIN' : 'USER'; // Default to USER unless explicitly ADMIN

    const userData = {
      name,
      email,
      password: hashedPassword,
      role: userRole,
      isVerified: false, // In a real app, send verification email
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('User').insertOne(userData);
    const user = { ...userData, id: result.insertedId.toString(), _id: result.insertedId };

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie('accessToken', accessToken, { httpOnly: true, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user: userWithoutPassword, accessToken }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { restaurant: true }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie('accessToken', accessToken, { httpOnly: true, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });

    const { password: _, ...userWithoutPassword } = user;
    res.json({
      success: true,
      message: 'Login successful',
      data: { user: userWithoutPassword, accessToken }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully' });
};

exports.me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { restaurant: true }
    });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, data: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
