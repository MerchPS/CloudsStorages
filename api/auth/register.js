const bcrypt = require('bcryptjs');

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
};
