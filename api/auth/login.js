const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Simpan data user sementara (dalam produksi, gunakan database)
const users = new Map();

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id, password } = req.body;

    // Validasi input
    if (!id || !password) {
      return res.status(400).json({ message: 'ID dan password diperlukan' });
    }

    // Cek apakah user ada
    const user = users.get(id);
    if (!user) {
      return res.status(401).json({ message: 'ID atau password salah' });
    }

    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'ID atau password salah' });
    }

    // Buat JWT token
    const token = jwt.sign(
      { userId: user.id, binId: user.binId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set token sebagai HTTP-only cookie
    res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);

    res.status(200).json({ message: 'Login berhasil' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};
