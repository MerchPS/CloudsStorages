module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-TOKEN');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verifikasi JWT
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: 'Tidak terautentikasi' });
  }

  try {
    // Verifikasi token (gunakan library jwt di production)
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { binId } = decoded;
    if (!binId) {
      return res.status(401).json({ message: 'Token tidak valid' });
    }

    // Route berdasarkan path dan method
    const path = req.url.split('?')[0];

    if (req.method === 'GET' && path === '/api/jsonbin') {
      // Ambil data dari JSONBin
      const binResponse = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
        headers: {
          'X-Master-Key': process.env.JSONBIN_MASTER_KEY
        }
      });

      if (!binResponse.ok) {
        return res.status(binResponse.status).json({ message: 'Gagal mengambil data' });
      }

      const binData = await binResponse.json();
      res.status(200).json(binData.record);
    } 
    else if (req.method === 'PUT' && path === '/api/jsonbin') {
      // Update data di JSONBin
      const newData = req.body;

      const binResponse = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': process.env.JSONBIN_MASTER_KEY
        },
        body: JSON.stringify(newData)
      });

      if (!binResponse.ok) {
        return res.status(binResponse.status).json({ message: 'Gagal menyimpan data' });
      }

      res.status(200).json({ message: 'Data berhasil disimpan' });
    }
    else {
      res.status(404).json({ message: 'Endpoint not found' });
    }
  } catch (error) {
    console.error('JSONBin API error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token tidak valid' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token kedaluwarsa' });
    }
    
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};
