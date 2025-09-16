export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id, password } = req.body;

  if (!id || !password) {
    return res.status(400).json({ message: "ID dan Password wajib diisi" });
  }

  try {
    // Simpan user ke JSONBin
    const binResponse = await fetch("https://api.jsonbin.io/v3/b", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": process.env.JSONBIN_MASTER_KEY,
        "X-Bin-Name": `cloud-storage-${id}`,
      },
      body: JSON.stringify({
        id,
        password,
        files: [],
        folders: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });

    const data = await binResponse.json();

    if (!binResponse.ok) {
      return res.status(500).json({ message: "Gagal menyimpan user", error: data });
    }

    return res.status(200).json({ message: "Registrasi berhasil", binId: data.metadata.id });
  } catch (error) {
    console.error("=== REGISTER ERROR ===", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
