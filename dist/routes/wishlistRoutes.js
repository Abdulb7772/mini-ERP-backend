"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wishlistController_1 = require("../controllers/wishlistController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// All wishlist routes require authentication
router.use(auth_1.authenticate);
router.post("/", wishlistController_1.addToWishlist);
router.get("/", wishlistController_1.getWishlist);
router.get("/check", wishlistController_1.checkWishlistItem);
router.delete("/remove", wishlistController_1.removeFromWishlist);
router.delete("/clear", wishlistController_1.clearWishlist);
exports.default = router;
