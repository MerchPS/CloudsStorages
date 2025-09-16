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

    // 1. Cari bin user berdasarkan nama
    const searchResponse = await fetch(`https://api.jsonbin.io/v3/b?meta=false&q=name:cloud-storage-${id}`, {
      method: 'GET',
      headers: {
        'X-Master-Key': process.env.JSONBIN_MASTER_KEY
      }
    });

    if (!searchResponse.ok) {
      console.error('Error searching for user bin:', searchResponse.status);
      return res.status(500).json({ message: 'Server error: Cannot search user database' });
    }

    const searchResults = await searchResponse.json();
    
    if (!searchResults || searchResults.length === 0) {
      console.log('User bin not found for:', id);
      return res.status(401).json({ message: 'ID atau password salah' });
    }

    // 2. Ambil data user dari bin yang ditemukan
    const userBinId = searchResults[0].record.id || searchResults[0].record.metadata?.id;
    const userBinResponse = await fetch(`https://api.jsonbin.io/v3/b/${userBinId}`, {
      method: 'GET',
      headers: {
        'X-Master-Key': process.env.JSONBIN_MASTER_KEY,
        'X-Bin-Meta': false
      }
    });

    if (!userBinResponse.ok) {
      console.error('Error fetching user data:', userBinResponse.status);
      return res.status(500).json({ message: 'Server error: Cannot access user data' });
    }

    const userData = await userBinResponse.json();

    // 3. Verifikasi password
    console.log('User data found:', userData);
    
    // Periksa apakah data user memiliki struktur yang benar
    if (!userData.password) {
      console.error('User data structure invalid:', userData);
      return res.status(500).json({ message: 'Struktur data user tidak valid' });
    }

    const isPasswordValid = await bcrypt.compare(password, userData.password);
    console.log('Password validation result:', isPasswordValid);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'ID atau password salah' });
    }

    // 4. Buat JWT token
    const token = jwt.sign(
      { userId: id, binId: userBinId },
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
