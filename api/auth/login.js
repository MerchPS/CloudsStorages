const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const users = new Map();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { action, id, password, binId } = req.body;

    if (!id || !password) {
      return res.status(400).json({ message: 'ID dan password diperlukan' });
    }

    if (action === 'register') {
      if (users.has(id)) {
        return res.status(400).json({ message: 'User sudah ada' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      users.set(id, { id, password: hashedPassword, binId });

      return res.status(201).json({ message: 'Registrasi berhasil' });
    }

    if (action === 'login') {
      const user = users.get(id);
      if (!user) {
        return res.status(401).json({ message: 'ID atau password salah' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'ID atau password salah' });
      }

      const token = jwt.sign(
        { userId: user.id, binId: user.binId },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.setHeader(
        'Set-Cookie',
        `token=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400${
          process.env.NODE_ENV === 'production' ? '; Secure' : ''
        }`
      );

      return res.status(200).json({ message: 'Login berhasil' });
    }

    return res.status(400).json({ message: 'Aksi tidak valid' });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};
