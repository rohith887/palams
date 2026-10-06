/**
 * PBLMS — Health Check Routes
 * Pharmaceutical Bin Lifecycle Management System
 *
 * Mounts the health check endpoint. No authentication required.
 */

const express = require('express');
const router = express.Router();
const { getHealth } = require('../controllers/health.controller');

// GET /api/health
router.get('/', getHealth);

module.exports = router;