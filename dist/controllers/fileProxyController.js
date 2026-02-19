"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyFile = void 0;
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
/**
 * Proxy endpoint to serve Cloudinary PDFs with inline Content-Disposition
 * This allows PDFs to open in browser instead of downloading
 */
const proxyFile = async (req, res) => {
    try {
        const fileUrl = req.query.url;
        if (!fileUrl) {
            res.status(400).json({
                success: false,
                message: 'File URL is required'
            });
            return;
        }
        // Validate that it's a Cloudinary URL
        if (!fileUrl.includes('cloudinary.com')) {
            res.status(400).json({
                success: false,
                message: 'Only Cloudinary URLs are allowed'
            });
            return;
        }
        console.log(`🔗 Proxying file: ${fileUrl}`);
        // Determine if HTTPS or HTTP
        const protocol = fileUrl.startsWith('https') ? https_1.default : http_1.default;
        // Fetch the file from Cloudinary
        protocol.get(fileUrl, (cloudinaryResponse) => {
            // Check if request was successful
            if (cloudinaryResponse.statusCode !== 200) {
                console.error(`❌ Failed to fetch file: ${cloudinaryResponse.statusCode}`);
                res.status(cloudinaryResponse.statusCode || 500).json({
                    success: false,
                    message: 'Failed to fetch file from Cloudinary'
                });
                return;
            }
            // Get content type from Cloudinary response
            const contentType = cloudinaryResponse.headers['content-type'] || 'application/octet-stream';
            const contentLength = cloudinaryResponse.headers['content-length'];
            // Detect if this is a PDF from URL path (raw/upload means document/PDF)
            const isRawUpload = fileUrl.includes('/raw/upload/');
            const urlHasPdfExt = /\.pdf(\?|$)/i.test(fileUrl);
            const isPdfContentType = contentType.toLowerCase().includes('pdf');
            const isPDF = isRawUpload || urlHasPdfExt || isPdfContentType;
            // Extract filename from URL
            let filename = 'document';
            try {
                const urlParts = fileUrl.split('/');
                const lastPart = urlParts[urlParts.length - 1];
                // Remove query parameters
                let cleanFilename = lastPart.split('?')[0];
                // Remove Cloudinary version prefix (e.g., v1771326997)
                cleanFilename = cleanFilename.replace(/^v\d+[_-]?/, '');
                // Remove any remaining numeric timestamp prefixes
                cleanFilename = cleanFilename.replace(/^\d+[_-]/, '');
                // Decode URL encoding
                if (cleanFilename) {
                    filename = decodeURIComponent(cleanFilename);
                }
            }
            catch (error) {
                console.error('Error extracting filename:', error);
            }
            // Add appropriate file extension based on type
            if (isPDF && !filename.toLowerCase().endsWith('.pdf')) {
                filename = filename + '.pdf';
            }
            else if (contentType.includes('word') && !filename.toLowerCase().match(/\.(doc|docx)$/)) {
                filename = filename + '.docx';
            }
            else if (contentType.includes('text') && !filename.toLowerCase().match(/\.txt$/)) {
                filename = filename + '.txt';
            }
            console.log(`📄 Serving file: ${filename} (${contentType})`);
            // Set headers - use 'attachment' to force download with proper filename
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            if (contentLength) {
                res.setHeader('Content-Length', contentLength);
            }
            // Pipe the file data to response
            cloudinaryResponse.pipe(res);
            console.log(`✅ File proxied successfully (${contentType})`);
        }).on('error', (error) => {
            console.error('❌ Proxy error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to proxy file'
            });
        });
    }
    catch (error) {
        console.error('❌ Proxy error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to proxy file'
        });
    }
};
exports.proxyFile = proxyFile;
