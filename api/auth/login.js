export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id, password } = req.body; // pakai id biar sama dengan register

    console.log("=== LOGIN REQUEST BODY ===", { id, password });

    if (!id || !password) {
      return res.status(400).json({ error: "ID & password wajib diisi" });
    }

    if (!process.env.JSONBIN_ID || !process.env.JSONBIN_KEY) {
      return res.status(500).json({ error: "JSONBin config tidak tersedia" });
    }

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

    console.log("=== JSONBIN RESPONSE ===", JSON.stringify(data, null, 2));

    if (!data.record) {
      console.error("JSONBin tidak punya field 'record'");
      return res.status(500).json({ error: "Format JSONBin tidak sesuai" });
    }

    const users = Array.isArray(data.record) ? data.record : [];
    const user = users.find(
      (u) => u.id === id && u.password === password
    );

    console.log("=== USER FOUND ===", user);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    return res.status(200).json({
      success: true,
      user: { id: user.id, createdAt: user.createdAt },
    });
  } catch (err) {
    console.error("=== LOGIN ERROR ===", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
