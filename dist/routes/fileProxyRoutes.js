"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fileProxyController_1 = require("../controllers/fileProxyController");
const router = express_1.default.Router();
// @route   GET /api/file-proxy
// @desc    Proxy Cloudinary files with inline Content-Disposition
// @access  Public (but validates Cloudinary URLs only)
router.get('/', fileProxyController_1.proxyFile);
exports.default = router;
