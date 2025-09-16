const jwt = require('jsonwebtoken');

// Simpan data user sementara (dalam produksi, gunakan database)
const users = new Map();

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: 'Tidak terautentikasi' });
    }

    // Verifikasi token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Cek apakah user masih ada
    const user = users.get(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Token tidak valid' });
    }

    res.status(200).json({ authenticated: true, userId: decoded.userId });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token tidak valid' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token kedaluwarsa' });
    }
    
    console.error('Auth check error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};
