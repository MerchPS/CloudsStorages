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

    // 2. Cek apakah ID sudah digunakan
    if (users.has(id)) {
      return res.status(400).json({ message: 'ID sudah digunakan' });
    }

    // 3. Hash password
    console.log('Hashing password for user:', id);
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4. Buat storage bin untuk user
    const binResponse = await fetch('https://api.jsonbin.io/v3/b', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': process.env.JSONBIN_MASTER_KEY,
        'X-Bin-Name': `cloud-storage-${id}`
      },
      body: JSON.stringify({
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

    // 5. Simpan user ke users database
    users.set(id, {
      id,
      password: hashedPassword,
      binId: binData.metadata.id,
      createdAt: new Date().toISOString()
    });

    // 6. Update users database di JSONBin
    const updateUsersResponse = await fetch(`https://api.jsonbin.io/v3/b/${process.env.USERS_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': process.env.JSONBIN_MASTER_KEY
      },
      body: JSON.stringify({
        users: Array.from(users.entries()),
        updatedAt: new Date().toISOString()
      })
    });

    if (!updateUsersResponse.ok) {
      console.error('Error updating users database:', updateUsersResponse.status);
      // Rollback: Hapus user bin yang sudah dibuat
      await fetch(`https://api.jsonbin.io/v3/b/${binData.metadata.id}`, {
        method: 'DELETE',
        headers: {
          'X-Master-Key': process.env.JSONBIN_MASTER_KEY
        }
      });
      return res.status(500).json({ message: 'Gagal menyimpan data user' });
    }

    console.log('User registered successfully:', id);
    res.status(201).json({ message: 'Storage berhasil dibuat' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};
