const { PrismaClient } = require('@prisma/client');
const { MongoClient } = require('mongodb');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

// Create user (SUPERADMIN only)
exports.createUser = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db('petpooja-copy');

    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await db.collection('User').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      name,
      email,
      password: hashedPassword,
      role: role || 'USER',
      isVerified: true, // manually created users are auto-verified
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('User').insertOne(newUser);
    newUser.id = result.insertedId.toString();
    newUser._id = result.insertedId;

    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: userWithoutPassword.id,
        name: userWithoutPassword.name,
        email: userWithoutPassword.email,
        role: userWithoutPassword.role,
        isVerified: userWithoutPassword.isVerified,
        createdAt: userWithoutPassword.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await client.close();
  }
};

// Get all users (SUPERADMIN only)
exports.getAllUsers = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db('petpooja-copy');

    const users = await db.collection('User').find({}, {
      projection: {
        id: { $toString: '$_id' },
        name: 1,
        email: 1,
        role: 1,
        createdAt: 1,
        isVerified: 1
      }
    }).sort({ createdAt: -1 }).toArray();

    // Convert _id to id for consistency
    const formattedUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      isVerified: user.isVerified
    }));

    res.json({ success: true, data: formattedUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await client.close();
  }
};

// Update user role (SUPERADMIN only)
exports.updateUserRole = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    if (!['USER', 'ADMIN', 'SUPERADMIN'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Prevent changing your own role
    if (id === req.user.id) {
       return res.status(400).json({ success: false, message: 'Cannot modify your own role' });
    }

    await client.connect();
    const db = client.db('petpooja-copy');

    const result = await db.collection('User').updateOne(
      { _id: require('mongodb').ObjectId.createFromHexString(id) },
      { $set: { role, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User role updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await client.close();
  }
};

// Delete user (SUPERADMIN only)
exports.deleteUser = async (req, res) => {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.user.id) {
       return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    await client.connect();
    const db = client.db('petpooja-copy');

    const result = await db.collection('User').deleteOne({
      _id: require('mongodb').ObjectId.createFromHexString(id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await client.close();
  }
};

// Toggle User Verification (SUPERADMIN only)
exports.toggleUserVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;
    
    // Validate boolean
    if (typeof isVerified !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isVerified must be a boolean' });
    }

    // Prevent changing your own verification status
    if (id === req.user.id) {
       return res.status(400).json({ success: false, message: 'Cannot modify your own verification status' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isVerified },
      select: { id: true, name: true, email: true, role: true, isVerified: true }
    });
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
