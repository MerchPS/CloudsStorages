const jwt = require('jsonwebtoken');

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
    // Dapatkan token dari cookie atau header
    let token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    
    console.log('Auth check - Token:', token ? 'Provided' : 'Missing');

    if (!token) {
      return res.status(401).json({ message: 'Tidak terautentikasi' });
    }

    // Verifikasi token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-for-development');
    
    // Ambil data users untuk memverifikasi user masih ada
    const usersBinResponse = await fetch(`https://api.jsonbin.io/v3/b/${process.env.USERS_BIN_ID}`, {
      method: 'GET',
      headers: {
        'X-Master-Key': process.env.JSONBIN_MASTER_KEY,
        'X-Bin-Meta': false
      }
    });

    if (!usersBinResponse.ok) {
      return res.status(500).json({ message: 'Server error: Cannot access users database' });
    }

    const usersData = await usersBinResponse.json();
    const users = new Map(usersData.users || []);

    // Cek apakah user masih ada
    if (!users.has(decoded.userId)) {
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
