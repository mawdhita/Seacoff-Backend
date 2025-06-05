const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

router.get('/cart', cartController.getCart);
router.put('/cart/:id_cart', cartController.updateCartQuantity);
router.delete('/cart/:id_cart', cartController.deleteCartItem);

module.exports = router;
