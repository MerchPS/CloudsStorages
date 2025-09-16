import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { username, password } = req.body;

    console.log("=== LOGIN REQUEST BODY ===");
    console.log("Username:", username);
    console.log("Password:", password);

    // Ambil data user dari JSONBin
    const response = await fetch(`https://api.jsonbin.io/v3/b/${process.env.JSONBIN_ID}/latest`, {
      headers: {
        "X-Master-Key": process.env.JSONBIN_KEY,
      },
    });

    const data = await response.json();

    console.log("=== JSONBIN RESPONSE ===");
    console.log(JSON.stringify(data, null, 2));

    // Cari user
    const user = data.record.find(
      (u) => u.username === username && u.password === password
    );

    console.log("=== USER FOUND ===");
    console.log(user);

    if (!user) {
      console.log("Login gagal: user tidak ditemukan atau password salah.");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    return res.status(200).json({ success: true, user });
  } catch (err) {
    console.error("=== LOGIN ERROR ===");
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
