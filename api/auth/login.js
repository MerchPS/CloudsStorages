import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { username, password } = req.body;

    console.log("=== LOGIN REQUEST BODY ===");
    console.log({ username, password });

    if (!username || !password) {
      return res.status(400).json({ error: "Username & password wajib diisi" });
    }

    // Ambil data dari JSONBin
    const response = await fetch(
      `https://api.jsonbin.io/v3/b/${process.env.JSONBIN_ID}/latest`,
      {
        headers: {
          "X-Master-Key": process.env.JSONBIN_KEY,
        },
      }
    );

    console.log("=== JSONBIN STATUS ===", response.status);

    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error("Gagal parse JSON:", e);
      return res.status(500).json({ error: "Response JSONBin tidak valid" });
    }

    console.log("=== JSONBIN RESPONSE ===");
    console.log(JSON.stringify(data, null, 2));

    if (!data.record) {
      console.error("JSONBin tidak punya field 'record'");
      return res.status(500).json({ error: "Format JSONBin tidak sesuai" });
    }

    // Cari user
    const user = data.record.find(
      (u) => u.username === username && u.password === password
    );

    console.log("=== USER FOUND ===", user);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    return res.status(200).json({ success: true, user });
  } catch (err) {
    console.error("=== LOGIN ERROR ===", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
