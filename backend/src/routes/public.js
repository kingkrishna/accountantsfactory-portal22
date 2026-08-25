const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// Public route for contact form submissions
router.post('/contact', publicController.submitContactForm);
// Feature E: public franchise application form
router.post('/franchise-signup', publicController.submitFranchiseApplication);

module.exports = router;
