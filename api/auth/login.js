import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id, password } = req.body;
  console.log("=== LOGIN REQUEST BODY ===", req.body);

  if (!id || !password) {
    return res.status(400).json({ message: "ID dan password wajib diisi" });
  }

  try {
    // Ambil daftar user dari JSONBin
    const usersResponse = await fetch(process.env.JSONBIN_USERS_URL, {
      headers: { "X-Master-Key": process.env.JSONBIN_MASTER_KEY },
    });
    const usersData = await usersResponse.json();

    const userEntry = usersData.record.find((u) => u.id === id);
    if (!userEntry) {
      return res.status(401).json({ message: "User tidak ditemukan" });
    }

    // Ambil data user dari binId
    const userResponse = await fetch(
      `https://api.jsonbin.io/v3/b/${userEntry.binId}/latest`,
      { headers: { "X-Master-Key": process.env.JSONBIN_MASTER_KEY } }
    );
    const userData = await userResponse.json();

    const user = userData.record;

    // Cek password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Password salah" });
    }

    // Buat JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.setHeader(
      "Set-Cookie",
      cookie.serialize("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 3600,
      })
    );

    return res.status(200).json({ message: "Login berhasil", token });
  } catch (error) {
    console.error("=== LOGIN ERROR ===", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
