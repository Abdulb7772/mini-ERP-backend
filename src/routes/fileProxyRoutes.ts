import express from 'express';
import { proxyFile } from '../controllers/fileProxyController';

const router = express.Router();

// @route   GET /api/file-proxy
// @desc    Proxy Cloudinary files with inline Content-Disposition
// @access  Public (but validates Cloudinary URLs only)
router.get('/', proxyFile);

export default router;
