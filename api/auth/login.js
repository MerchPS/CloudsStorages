import jwt from "jsonwebtoken";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id, password } = req.body;
  console.log("=== LOGIN REQUEST BODY ===", req.body);

  if (!id || !password) {
    return res.status(400).json({ message: "ID dan Password wajib diisi" });
  }

  try {
    // Cari bin user berdasarkan nama
    const searchResponse = await fetch(
      `https://api.jsonbin.io/v3/b?meta=true&name=cloud-storage-${id}`,
      {
        method: "GET",
        headers: {
          "X-Master-Key": process.env.JSONBIN_MASTER_KEY,
        },
      }
    );

    const searchData = await searchResponse.json();

    if (!searchResponse.ok || !searchData || !searchData.records || searchData.records.length === 0) {
      return res.status(401).json({ message: "User tidak ditemukan" });
    }

    const userBin = searchData.records[0];

    // Ambil isi bin
    const userResponse = await fetch(
      `https://api.jsonbin.io/v3/b/${userBin.metadata.id}/latest`,
      {
        method: "GET",
        headers: {
          "X-Master-Key": process.env.JSONBIN_MASTER_KEY,
        },
      }
    );

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      return res.status(500).json({ message: "Gagal membaca data user", error: userData });
    }

    const user = userData.record;

    // Cek password
    if (user.password !== password) {
      return res.status(401).json({ message: "Password salah" });
    }

    // Buat JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Set cookie
    res.setHeader(
      "Set-Cookie",
      cookie.serialize("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60,
      })
    );

    return res.status(200).json({ message: "Login berhasil", token });
  } catch (error) {
    console.error("=== LOGIN ERROR ===", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
