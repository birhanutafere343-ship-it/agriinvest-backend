const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

app.get('/', (req, res) => {
  res.send('Agricultural Investment API is running...');
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, phone, password } = req.body;
    if (!fullName || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { fullName, phone, password: hashedPassword }
    });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, fullName: user.fullName, phone: user.phone, vipLevel: user.vipLevel, balance: user.balance } });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, fullName: user.fullName, phone: user.phone, vipLevel: user.vipLevel, balance: user.balance } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

app.post('/api/deposits', async (req, res) => {
  try {
    const { userId, amount, vipTier, bankRef, receiptUrl } = req.body;
    if (!userId || !amount || !bankRef) {
      return res.status(400).json({ error: 'Missing required deposit information' });
    }

    const deposit = await prisma.deposit.create({
      data: { userId, amount: parseFloat(amount), vipTier: parseInt(vipTier), bankRef, receiptUrl }
    });

    res.json({ message: 'Deposit submitted for admin verification', deposit });
  } catch (err) {
    res.status(500).json({ error: 'Deposit submission failed', details: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
