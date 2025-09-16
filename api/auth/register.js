const bcrypt = require('bcryptjs');

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

    if (id.length < 3) {
      return res.status(400).json({ message: 'ID harus minimal 3 karakter' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password harus minimal 6 karakter' });
    }

    // 1. Cek apakah user sudah ada dengan mencari bin berdasarkan nama
    const searchResponse = await fetch(`https://api.jsonbin.io/v3/b?meta=false&q=name:cloud-storage-${id}`, {
      method: 'GET',
      headers: {
        'X-Master-Key': process.env.JSONBIN_MASTER_KEY
      }
    });

    if (searchResponse.ok) {
      const searchResults = await searchResponse.json();
      if (searchResults && searchResults.length > 0) {
        return res.status(400).json({ message: 'ID sudah digunakan' });
      }
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 3. Buat bin untuk user baru
    const binResponse = await fetch('https://api.jsonbin.io/v3/b', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': process.env.JSONBIN_MASTER_KEY,
        'X-Bin-Name': `cloud-storage-${id}`
      },
      body: JSON.stringify({
        id: id,
        password: hashedPassword,
        files: [],
        folders: [{ id: 'root', name: 'Root', children: [] }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    });

    const binData = await binResponse.json();

    if (!binResponse.ok) {
      console.error('Error creating JSONBin:', binData);
      return res.status(500).json({ message: 'Gagal membuat storage' });
    }

    console.log('User registered successfully:', id);
    res.status(201).json({ message: 'Storage berhasil dibuat' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};
