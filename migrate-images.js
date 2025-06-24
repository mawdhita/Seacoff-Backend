const path = require('path');
const fs = require('fs');
const cloudinary = require('./cloudinary'); // config di atas
const pool = require('./db'); // mysql2/promise pool

(async () => {
  try {
    // Ambil semua menu
    const [menus] = await pool.query('SELECT id_menu, foto_menu FROM menu');

    for (const menu of menus) {
      if (!menu.foto_menu) continue;

      const filePath = path.join(__dirname, 'uploads', menu.foto_menu);

      if (!fs.existsSync(filePath)) {
        console.warn(`❌ File ${menu.foto_menu} tidak ada di uploads/`);
        continue;
      }

      console.log(`⬆️ Uploading ${menu.foto_menu}...`);
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'menu-images',
      });

      // Update DB
      await pool.query('UPDATE menu SET foto_menu = ? WHERE id_menu = ?', [
        result.secure_url,
        menu.id_menu,
      ]);

      console.log(`✅ Sukses: ${menu.foto_menu} → ${result.secure_url}`);
    }

    console.log('🎉 Semua gambar selesai di-upload ke Cloudinary.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error migrasi:', error);
    process.exit(1);
  }
})();
