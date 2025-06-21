const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Use memory storage for Vercel compatibility
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create uploads directory:', err);
  }
}

// GET semua menu
router.get('/', (req, res) => {
  const query = 'SELECT * FROM menu';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error saat mengambil data menu:', err);
      return res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
    res.json(results);
  });
});

// POST tambah menu baru dengan upload foto
router.post('/', upload.single('foto_menu'), (req, res) => {
  try {
    const { nama_menu, deskripsi, harga, kategori } = req.body;
    
    // Validation
    if (!nama_menu || !nama_menu.trim()) {
      return res.status(400).json({ error: 'Nama menu harus diisi' });
    }
    
    if (!harga || isNaN(harga) || parseFloat(harga) <= 0) {
      return res.status(400).json({ error: 'Harga harus berupa angka yang valid dan lebih dari 0' });
    }
    
    if (!kategori) {
      return res.status(400).json({ error: 'Kategori harus dipilih' });
    }
    
    let foto_menu = null;
    
    // Handle file upload if present
    if (req.file) {
      const fileName = Date.now() + path.extname(req.file.originalname);
      const filePath = path.join(uploadsDir, fileName);
      
      try {
        // Write file from memory to disk
        fs.writeFileSync(filePath, req.file.buffer);
        foto_menu = fileName;
      } catch (fileErr) {
        console.error('Error saving file:', fileErr);
        return res.status(500).json({ error: 'Gagal menyimpan file gambar' });
      }
    }

    const query = 'INSERT INTO menu (nama_menu, deskripsi, harga, kategori, foto_menu) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [nama_menu.trim(), deskripsi || '', parseFloat(harga), kategori, foto_menu], (err, results) => {
      if (err) {
        console.error('Error saat menambah menu:', err);
        
        // Clean up uploaded file if database insert fails
        if (foto_menu) {
          try {
            fs.unlinkSync(path.join(uploadsDir, foto_menu));
          } catch (unlinkErr) {
            console.error('Error cleaning up file:', unlinkErr);
          }
        }
        
        return res.status(500).json({ error: 'Internal Server Error', details: err.message });
      }
      
      res.status(201).json({ 
        id_menu: results.insertId, 
        nama_menu: nama_menu.trim(), 
        deskripsi: deskripsi || '', 
        harga: parseFloat(harga), 
        kategori, 
        foto_menu 
      });
    });
  } catch (error) {
    console.error('Unexpected error in POST /menu:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// PUT update menu dengan upload foto (opsional)
router.put('/:id', upload.single('foto_menu'), (req, res) => {
  try {
    const { nama_menu, deskripsi, harga, kategori } = req.body;
    const id_menu = req.params.id;

    // Validation
    if (!nama_menu || !nama_menu.trim()) {
      return res.status(400).json({ error: 'Nama menu harus diisi' });
    }
    
    if (!harga || isNaN(harga) || parseFloat(harga) <= 0) {
      return res.status(400).json({ error: 'Harga harus berupa angka yang valid dan lebih dari 0' });
    }
    
    if (!kategori) {
      return res.status(400).json({ error: 'Kategori harus dipilih' });
    }

    const selectQuery = 'SELECT foto_menu FROM menu WHERE id_menu = ?';
    db.query(selectQuery, [id_menu], (err, result) => {
      if (err) {
        console.error('Error saat ambil foto menu lama:', err);
        return res.status(500).json({ error: 'Internal Server Error', details: err.message });
      }

      if (result.length === 0) {
        return res.status(404).json({ error: 'Menu tidak ditemukan' });
      }

      const oldFoto = result[0].foto_menu;
      let newFoto = oldFoto;

      if (req.file) {
        const fileName = Date.now() + path.extname(req.file.originalname);
        const filePath = path.join(uploadsDir, fileName);
        
        try {
          // Write new file from memory to disk
          fs.writeFileSync(filePath, req.file.buffer);
          newFoto = fileName;
          
          // Delete old file if exists
          if (oldFoto) {
            const oldPath = path.join(uploadsDir, oldFoto);
            try {
              fs.unlinkSync(oldPath);
            } catch (unlinkErr) {
              if (unlinkErr.code !== 'ENOENT') {
                console.warn('Gagal hapus file lama:', unlinkErr.message);
              }
            }
          }
        } catch (fileErr) {
          console.error('Error saving new file:', fileErr);
          return res.status(500).json({ error: 'Gagal menyimpan file gambar baru' });
        }
      }

      const updateQuery = 'UPDATE menu SET nama_menu = ?, deskripsi = ?, harga = ?, kategori = ?, foto_menu = ? WHERE id_menu = ?';
      db.query(updateQuery, [nama_menu.trim(), deskripsi || '', parseFloat(harga), kategori, newFoto, id_menu], (err) => {
        if (err) {
          console.error('Error saat update menu:', err);
          
          // Clean up new file if database update fails
          if (req.file && newFoto !== oldFoto) {
            try {
              fs.unlinkSync(path.join(uploadsDir, newFoto));
            } catch (unlinkErr) {
              console.error('Error cleaning up new file:', unlinkErr);
            }
          }
          
          return res.status(500).json({ error: 'Internal Server Error', details: err.message });
        }
        
        res.json({ success: true });
      });
    });
  } catch (error) {
    console.error('Unexpected error in PUT /menu:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// DELETE menu
router.delete('/:id', (req, res) => {
  try {
    const id_menu = req.params.id;
    
    // First get the photo filename to delete the file
    const selectQuery = 'SELECT foto_menu FROM menu WHERE id_menu = ?';
    db.query(selectQuery, [id_menu], (err, result) => {
      if (err) {
        console.error('Error saat ambil data menu untuk delete:', err);
        return res.status(500).json({ error: 'Internal Server Error', details: err.message });
      }
      
      const foto_menu = result.length > 0 ? result[0].foto_menu : null;
      
      // Delete from database
      const deleteQuery = 'DELETE FROM menu WHERE id_menu = ?';
      db.query(deleteQuery, [id_menu], (err, deleteResult) => {
        if (err) {
          console.error('Error saat menghapus menu:', err);
          return res.status(500).json({ error: 'Internal Server Error', details: err.message });
        }
        
        if (deleteResult.affectedRows === 0) {
          return res.status(404).json({ error: 'Menu tidak ditemukan' });
        }
        
        // Delete file if exists
        if (foto_menu) {
          const filePath = path.join(uploadsDir, foto_menu);
          try {
            fs.unlinkSync(filePath);
          } catch (unlinkErr) {
            if (unlinkErr.code !== 'ENOENT') {
              console.warn('Gagal hapus file foto:', unlinkErr.message);
            }
          }
        }
        
        res.json({ success: true });
      });
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /menu:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

module.exports = router;