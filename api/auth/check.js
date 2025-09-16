const jwt = require('jsonwebtoken');
const cookie = require('cookie');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.token;

    if (!token) {
      return res.status(401).json({ message: 'Tidak terautentikasi' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.status(200).json({ authenticated: true, userId: decoded.userId, binId: decoded.binId });
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
