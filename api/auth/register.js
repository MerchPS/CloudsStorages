import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id, password } = req.body;

  if (!id || !password) {
    return res.status(400).json({ message: "ID dan password wajib diisi" });
  }

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Buat bin untuk user
    const binResponse = await fetch("https://api.jsonbin.io/v3/b", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": process.env.JSONBIN_MASTER_KEY,
        "X-Bin-Name": `cloud-storage-${id}`,
      },
      body: JSON.stringify({
        id,
        password: hashedPassword,
        files: [],
        folders: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });

    const binData = await binResponse.json();

    if (!binResponse.ok) {
      return res.status(500).json({ message: "Gagal membuat storage", error: binData });
    }

    const binId = binData.metadata.id;

    // Simpan user ke daftar users.json
    await fetch(process.env.JSONBIN_USERS_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": process.env.JSONBIN_MASTER_KEY,
      },
      body: JSON.stringify({ id, binId }),
    });

    return res.status(201).json({ message: "User berhasil dibuat", binId });
  } catch (error) {
    console.error("=== REGISTER ERROR ===", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
