const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

    console.log('Login attempt for user:', id);

    // 1. Ambil data users dari JSONBin (users database)
    const usersBinResponse = await fetch(`https://api.jsonbin.io/v3/b/${process.env.USERS_BIN_ID}`, {
      method: 'GET',
      headers: {
        'X-Master-Key': process.env.JSONBIN_MASTER_KEY,
        'X-Bin-Meta': false
      }
    });

    if (!usersBinResponse.ok) {
      console.error('Error fetching users data:', usersBinResponse.status);
      return res.status(500).json({ message: 'Server error: Cannot access users database' });
    }

    const usersData = await usersBinResponse.json();
    const users = new Map(usersData.users || []);

    // 2. Cek apakah user ada
    if (!users.has(id)) {
      console.log('User not found:', id);
      return res.status(401).json({ message: 'ID atau password salah' });
    }

    const user = users.get(id);

    // 3. Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password validation result:', isPasswordValid);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'ID atau password salah' });
    }

    // 4. Buat JWT token
    const token = jwt.sign(
      { userId: user.id, binId: user.binId },
      process.env.JWT_SECRET || 'fallback-secret-key-for-development',
      { expiresIn: '24h' }
    );

    // 5. Set token sebagai HTTP-only cookie
    res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);

    res.status(200).json({ message: 'Login berhasil' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};
