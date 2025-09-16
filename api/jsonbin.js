export default async function handler(req, res) {
  const { method } = req;
  const { binId, apiSet, data } = req.body || {};

  // pilih API set 1 atau 2
  let masterKey, accessKey;
  if (apiSet === "1") {
    masterKey = process.env.JSONBIN_MASTER1;
    accessKey = process.env.JSONBIN_ACCESS1;
  } else {
    masterKey = process.env.JSONBIN_MASTER2;
    accessKey = process.env.JSONBIN_ACCESS2;
  }

  if (!binId || !apiSet) {
    return res.status(400).json({ error: "binId dan apiSet diperlukan" });
  }

  const url = `https://api.jsonbin.io/v3/b/${binId}`;
  const headers = {
    "Content-Type": "application/json",
    "X-Master-Key": masterKey,
    "X-Access-Key": accessKey
  };

  try {
    let response;
    if (method === "POST") {
      response = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify(data)
      });
    } else {
      response = await fetch(url, { method: "GET", headers });
    }

    const result = await response.json();
    res.status(200).json(result);

  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
