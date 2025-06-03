// controllers/orderController.js
const db = require('../db'); // Import db.js dari root project

const placeOrder = (req, res) => {
  const { id_user, total_pesanan, status } = req.body;

  // Pastikan data id_user, total_pesanan, dan status ada
  if (!id_user || !total_pesanan || !status) {
    return res.status(400).json({ message: "Data yang dimasukkan tidak lengkap" });
  }

  // Menyimpan data pesanan ke dalam tabel orders
  const sql = `INSERT INTO orders (id_user, total_pesanan, status, created_at, updated_at)
               VALUES (?, ?, ?, NOW(), NOW())`;

  db.query(sql, [id_user, total_pesanan, status], (err, result) => {
    if (err) return res.status(500).json({ message: 'Gagal menyimpan pesanan' });
    res.status(201).json({ message: 'Pesanan berhasil disimpan', orderId: result.insertId });
  });
};

module.exports = { placeOrder };
