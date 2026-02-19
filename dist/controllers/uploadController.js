"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFiles = void 0;
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const stream_1 = require("stream");
/**
 * Upload files to Cloudinary (signed upload)
 * Supports images and raw files (PDFs, documents)
 */
const uploadFiles = async (req, res) => {
    try {
        // Check if files were uploaded
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            res.status(400).json({
                success: false,
                message: 'No files provided'
            });
            return;
        }
        console.log(`📤 Uploading ${req.files.length} file(s) to Cloudinary...`);
        // Upload each file
        const uploadPromises = req.files.map((file) => {
            return new Promise((resolve, reject) => {
                // Determine resource type based on file mimetype
                const isImage = file.mimetype.startsWith('image/');
                const resourceType = isImage ? 'image' : 'raw';
                console.log(`📂 Uploading ${file.originalname} (${file.mimetype}) as ${resourceType}`);
                // Create upload stream
                const uploadStream = cloudinary_1.default.uploader.upload_stream({
                    resource_type: resourceType,
                    folder: 'mini-erp',
                    public_id: `${Date.now()}_${file.originalname.replace(/\.[^/.]+$/, '')}`,
                    access_mode: 'public', // Ensure public access
                    type: 'upload', // Use 'upload' delivery type for public access
                    // For PDFs and documents, set flags to allow inline viewing
                    ...(resourceType === 'raw' && {
                        flags: 'attachment:false', // Prevent force download
                    }),
                }, (error, result) => {
                    if (error) {
                        console.error(`❌ Upload failed for ${file.originalname}:`, error);
                        reject(error);
                    }
                    else if (result) {
                        console.log(`✅ Uploaded: ${result.secure_url}`);
                        resolve(result.secure_url);
                    }
                    else {
                        reject(new Error('Upload failed - no result returned'));
                    }
                });
                // Convert buffer to stream and pipe to Cloudinary
                const bufferStream = stream_1.Readable.from(file.buffer);
                bufferStream.pipe(uploadStream);
            });
        });
        // Wait for all uploads to complete
        const urls = await Promise.all(uploadPromises);
        console.log(`✅ Successfully uploaded ${urls.length} file(s)`);
        res.status(200).json({
            success: true,
            message: `${urls.length} file(s) uploaded successfully`,
            data: {
                urls,
            },
        });
    }
    catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to upload files',
        });
    }
};
exports.uploadFiles = uploadFiles;
