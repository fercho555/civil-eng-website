// routes/contact.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: "Contact route" });
});

module.exports = router;
