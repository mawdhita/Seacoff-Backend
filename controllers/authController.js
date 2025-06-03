// controllers/authController.js
const db = require('../db'); // Import db.js dari root project

const loginAdmin = (req, res) => {
  const { username, password } = req.body;

  const sql = "SELECT * FROM admins WHERE username = ? AND password = ?";
  db.query(sql, [username, password], (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });

    if (results.length === 0) {
      return res.status(401).json({ message: "Username atau password salah" });
    }

    return res.status(200).json({ message: "Login berhasil" });
  });
};

module.exports = { loginAdmin };
