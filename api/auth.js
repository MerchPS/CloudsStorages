const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Simpan data user sementara (dalam produksi, gunakan database)
const users = new Map();

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Route berdasarkan path
  const path = req.url.split('?')[0];

  if (path === '/api/auth/register' && req.method === 'POST') {
    return handleRegister(req, res);
  } else if (path === '/api/auth/login' && req.method === 'POST') {
    return handleLogin(req, res);
  } else if (path === '/api/auth/check' && req.method === 'GET') {
    return handleCheckAuth(req, res);
  } else if (path === '/api/auth/logout' && req.method === 'POST') {
    return handleLogout(req, res);
  } else {
    return res.status(404).json({ message: 'Endpoint not found' });
  }
};

async function handleRegister(req, res) {
  try {
    const { id, password } = req.body;

    // Validasi input
    if (!id || !password) {
      return res.status(400).json({ message: 'ID dan password diperlukan' });
    }

    if (id.length < 3) {
      return res.status(400).json({ message: 'ID harus minimal 3 karakter' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password harus minimal 6 karakter' });
    }

    // Cek apakah ID sudah digunakan
    if (users.has(id)) {
      return res.status(400).json({ message: 'ID sudah digunakan' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Simpan user (dalam produksi, simpan ke database)
    users.set(id, {
      id,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    });

    // Buat struktur data awal di JSONBin
    try {
      const binResponse = await fetch('https://api.jsonbin.io/v3/b', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': process.env.JSONBIN_MASTER_KEY,
          'X-Bin-Name': `cloud-storage-${id}`
        },
        body: JSON.stringify({
          files: [],
          folders: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });

      const binData = await binResponse.json();

      if (!binResponse.ok) {
        console.error('Error creating JSONBin:', binData);
        users.delete(id); // Hapus user jika gagal membuat bin
        return res.status(500).json({ message: 'Gagal membuat storage' });
      }

      // Simpan binId ke user data
      users.get(id).binId = binData.metadata.id;

    } catch (error) {
      console.error('Error creating JSONBin:', error);
      users.delete(id); // Hapus user jika gagal membuat bin
      return res.status(500).json({ message: 'Gagal membuat storage' });
    }

    res.status(201).json({ message: 'Storage berhasil dibuat' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}

async function handleLogin(req, res) {
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
}

async function handleCheckAuth(req, res) {
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
}

async function handleLogout(req, res) {
  // Hapus cookie dengan mengatur expiry di masa lalu
  res.setHeader('Set-Cookie', `token=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  res.status(200).json({ message: 'Logout berhasil' });
}
