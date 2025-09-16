import jwt from "jsonwebtoken";
import cookie from "cookie";

export default async function handler(req, res) {
  try {
    const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
    const token = cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    return res.status(200).json({ message: "Authorized", user: decoded });
  } catch (error) {
    console.error("=== CHECK ERROR ===", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
}
