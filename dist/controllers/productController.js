"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateVariationStock = exports.updateProductStock = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProduct = exports.getProducts = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const Variation_1 = __importDefault(require("../models/Variation"));
const errorHandler_1 = require("../middlewares/errorHandler");
const getProducts = async (req, res, next) => {
    try {
        console.log("📦 [Products] Getting products - User:", req.user?.email);
        console.log("📦 [Products] Query params:", req.query);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const category = req.query.category;
        const includeVariations = req.query.includeVariations === 'true';
        const query = { isActive: true };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { sku: { $regex: search, $options: "i" } },
            ];
        }
        if (category) {
            query.category = category;
        }
        console.log("📦 [Products] Query filter:", JSON.stringify(query));
        const total = await Product_1.default.countDocuments(query);
        console.log("📦 [Products] Total matching products:", total);
        const products = await Product_1.default.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        console.log("📦 [Products] Products fetched:", products.length);
        // Fetch ALL variations in a single query for products that have variations
        const productIds = products
            .filter(p => p.hasVariations)
            .map(p => p._id);
        let variationsMap = new Map();
        if (productIds.length > 0) {
            const allVariations = await Variation_1.default.find({
                productId: { $in: productIds },
                isActive: true
            });
            // Group variations by productId
            allVariations.forEach(variation => {
                const productId = variation.productId.toString();
                if (!variationsMap.has(productId)) {
                    variationsMap.set(productId, []);
                }
                variationsMap.get(productId).push(variation);
            });
        }
        // Calculate stock and lowest price from variations
        const productsWithStock = products.map((product) => {
            const productObj = product.toObject();
            if (product.hasVariations) {
                const variations = variationsMap.get(product._id.toString()) || [];
                const totalStock = variations.reduce((sum, v) => sum + (v.stock || 0), 0);
                productObj.stock = totalStock;
                // Calculate lowest price for products with variations
                if (variations.length > 0) {
                    const prices = variations.map(v => v.price);
                    productObj.lowestPrice = Math.min(...prices);
                }
                // Include variations if requested
                if (includeVariations) {
                    productObj.variations = variations;
                }
            }
            return productObj;
        });
        console.log("✅ [Products] Sending response with", productsWithStock.length, "products");
        res.status(200).json({
            status: "success",
            data: productsWithStock,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error("❌ [Products] Error:", error);
        next(error);
    }
};
exports.getProducts = getProducts;
const getProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const product = await Product_1.default.findById(id);
        if (!product) {
            throw new errorHandler_1.AppError("Product not found", 404);
        }
        let variations = [];
        if (product.hasVariations) {
            variations = await Variation_1.default.find({ productId: id, isActive: true });
            // Calculate total stock from variations
            const totalStock = variations.reduce((sum, v) => sum + (v.stock || 0), 0);
            product.stock = totalStock;
            await product.save();
        }
        res.status(200).json({
            status: "success",
            data: {
                product,
                variations,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getProduct = getProduct;
const createProduct = async (req, res, next) => {
    try {
        console.log('=== CREATE PRODUCT REQUEST ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        const { name, sku, category, price, hasVariations, stock, description, variations, imageUrl, images, } = req.body;
        console.log('Images received:', images);
        console.log('ImageUrl received:', imageUrl);
        const existingProduct = await Product_1.default.findOne({ sku });
        if (existingProduct) {
            throw new errorHandler_1.AppError("SKU already exists", 400);
        }
        const product = await Product_1.default.create({
            name,
            sku,
            category,
            price,
            hasVariations,
            stock: hasVariations ? 0 : stock,
            description,
            imageUrl,
            images,
        });
        console.log('Product created:', product);
        let createdVariations = [];
        if (hasVariations && variations && variations.length > 0) {
            createdVariations = await Variation_1.default.insertMany(variations.map((v) => ({
                ...v,
                productId: product._id,
            })));
            // Calculate total stock from variations
            const totalStock = createdVariations.reduce((sum, v) => sum + (v.stock || 0), 0);
            product.stock = totalStock;
            await product.save();
        }
        res.status(201).json({
            status: "success",
            data: {
                product,
                variations: createdVariations,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, category, price, description, isActive, imageUrl, images, } = req.body;
        const product = await Product_1.default.findById(id);
        if (!product) {
            throw new errorHandler_1.AppError("Product not found", 404);
        }
        if (name)
            product.name = name;
        if (category)
            product.category = category;
        if (price)
            product.price = price;
        if (description !== undefined)
            product.description = description;
        if (typeof isActive === "boolean")
            product.isActive = isActive;
        if (imageUrl !== undefined)
            product.imageUrl = imageUrl;
        if (images !== undefined)
            product.images = images;
        await product.save();
        res.status(200).json({
            status: "success",
            data: { product },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const product = await Product_1.default.findById(id);
        if (!product) {
            throw new errorHandler_1.AppError("Product not found", 404);
        }
        product.isActive = false;
        await product.save();
        res.status(200).json({
            status: "success",
            message: "Product deleted successfully",
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteProduct = deleteProduct;
// Update product stock
const updateProductStock = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { stock } = req.body;
        if (stock === undefined || stock < 0) {
            throw new errorHandler_1.AppError("Valid stock quantity is required", 400);
        }
        const product = await Product_1.default.findById(id);
        if (!product) {
            throw new errorHandler_1.AppError("Product not found", 404);
        }
        if (product.hasVariations) {
            throw new errorHandler_1.AppError("Cannot update stock for products with variations. Update individual variations instead.", 400);
        }
        product.stock = stock;
        await product.save();
        res.status(200).json({
            status: "success",
            data: { product },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateProductStock = updateProductStock;
// Update variation stock
const updateVariationStock = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { stock } = req.body;
        if (stock === undefined || stock < 0) {
            throw new errorHandler_1.AppError("Valid stock quantity is required", 400);
        }
        const variation = await Variation_1.default.findById(id);
        if (!variation) {
            throw new errorHandler_1.AppError("Variation not found", 404);
        }
        variation.stock = stock;
        await variation.save();
        // Update parent product's total stock
        const product = await Product_1.default.findById(variation.productId);
        if (product && product.hasVariations) {
            const allVariations = await Variation_1.default.find({
                productId: product._id,
                isActive: true
            });
            const totalStock = allVariations.reduce((sum, v) => sum + (v.stock || 0), 0);
            product.stock = totalStock;
            await product.save();
        }
        res.status(200).json({
            status: "success",
            data: { variation },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateVariationStock = updateVariationStock;
