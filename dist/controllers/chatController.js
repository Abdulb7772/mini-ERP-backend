"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteChat = exports.deleteMessage = exports.createSupportChat = exports.getStaffMembers = exports.getChatContext = exports.markMessagesAsRead = exports.sendMessage = exports.getChatMessages = exports.getChatById = exports.getUserChats = exports.createGroupChat = exports.createOrGetChat = void 0;
const Chat_1 = __importDefault(require("../models/Chat"));
const Message_1 = __importDefault(require("../models/Message"));
const User_1 = __importDefault(require("../models/User"));
const Customer_1 = __importDefault(require("../models/Customer"));
const Order_1 = __importDefault(require("../models/Order"));
const Product_1 = __importDefault(require("../models/Product"));
// Create or get one-to-one chat
const createOrGetChat = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        const { participantId, type = "internal", contextType, contextId } = req.body;
        if (!userId || !userRole) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!participantId) {
            return res.status(400).json({
                success: false,
                message: "Participant ID is required",
            });
        }
        // Validate type
        if (!["internal", "external"].includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Invalid chat type",
            });
        }
        // For external chats, validate that one is admin/staff and one is customer
        if (type === "external") {
            const isUserStaff = ["admin", "top_manager", "staff", "inventory_manager", "employee_manager", "order_manager", "customer_manager", "blog_manager", "report_manager"].includes(userRole || "");
            if (!isUserStaff) {
                return res.status(403).json({
                    success: false,
                    message: "Only staff can initiate external chats",
                });
            }
        }
        // Check for existing chat
        const existingChat = await Chat_1.default.findOne({
            type,
            isGroup: false,
            participants: { $all: [userId, participantId] },
            contextType: contextType || "general",
            contextId: contextId || null,
        })
            .populate("participants", "name email role")
            .lean();
        if (existingChat) {
            return res.status(200).json({
                success: true,
                data: existingChat,
            });
        }
        // Get participant details
        let participant;
        let participantRole;
        if (type === "external") {
            participant = await Customer_1.default.findById(participantId).select("name email");
            participantRole = "customer";
        }
        else {
            participant = await User_1.default.findById(participantId).select("name email role");
            participantRole = participant?.role || "staff";
        }
        if (!participant) {
            return res.status(404).json({
                success: false,
                message: "Participant not found",
            });
        }
        // Create new chat
        const chat = await Chat_1.default.create({
            type,
            participants: [userId, participantId],
            participantRoles: [userRole, participantRole],
            isGroup: false,
            contextType: contextType || "general",
            contextId: contextId || null,
            createdBy: userId,
            unreadCount: new Map(),
        });
        const populatedChat = await Chat_1.default.findById(chat._id)
            .populate("participants", "name email role")
            .lean();
        res.status(201).json({
            success: true,
            data: populatedChat,
        });
    }
    catch (error) {
        console.error("Error creating/getting chat:", error);
        res.status(500).json({
            success: false,
            message: "Error creating/getting chat",
            error: error.message,
        });
    }
};
exports.createOrGetChat = createOrGetChat;
// Create group chat (internal only)
const createGroupChat = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        const { groupName, participantIds, department } = req.body;
        if (!userId || !userRole) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        // Only admin can create groups
        if (userRole !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admin can create group chats",
            });
        }
        if (!groupName || !participantIds || participantIds.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Group name and at least 2 participants are required",
            });
        }
        // Add creator to participants if not included
        if (!participantIds.includes(userId)) {
            participantIds.push(userId);
        }
        // Get participant roles
        const participants = await User_1.default.find({
            _id: { $in: participantIds },
        }).select("role");
        const participantRoles = participants.map((p) => p.role);
        // Create group chat
        const chat = await Chat_1.default.create({
            type: "internal",
            participants: participantIds,
            participantRoles,
            isGroup: true,
            groupName,
            department: department || null,
            createdBy: userId,
            unreadCount: new Map(),
        });
        const populatedChat = await Chat_1.default.findById(chat._id)
            .populate("participants", "name email role")
            .lean();
        res.status(201).json({
            success: true,
            data: populatedChat,
        });
    }
    catch (error) {
        console.error("Error creating group chat:", error);
        res.status(500).json({
            success: false,
            message: "Error creating group chat",
            error: error.message,
        });
    }
};
exports.createGroupChat = createGroupChat;
// Get user's chats
const getUserChats = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { type, isGroup } = req.query;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const filter = {
            participants: userId,
        };
        if (type && ["internal", "external"].includes(type)) {
            filter.type = type;
        }
        // Filter by isGroup if provided
        if (isGroup !== undefined) {
            filter.isGroup = isGroup === "true";
        }
        const chats = await Chat_1.default.find(filter)
            .sort({ lastMessageAt: -1 })
            .lean();
        // Manually populate participants based on chat type
        for (let chat of chats) {
            const populatedParticipants = [];
            for (let i = 0; i < chat.participants.length; i++) {
                const participantId = chat.participants[i];
                const role = chat.participantRoles[i];
                if (role === "customer") {
                    const customer = await Customer_1.default.findById(participantId).select("name email").lean();
                    if (customer) {
                        populatedParticipants.push({ ...customer, role: "customer" });
                    }
                }
                else {
                    const user = await User_1.default.findById(participantId).select("name email role").lean();
                    if (user) {
                        populatedParticipants.push(user);
                    }
                }
            }
            chat.participants = populatedParticipants;
        }
        // Manually populate contextId for non-general contexts
        for (let chat of chats) {
            if (chat.contextType && chat.contextType !== "general" && chat.contextId) {
                try {
                    if (chat.contextType === "order") {
                        chat.contextId = await Order_1.default.findById(chat.contextId).lean();
                    }
                    else if (chat.contextType === "product") {
                        chat.contextId = await Product_1.default.findById(chat.contextId).lean();
                    }
                    else if (chat.contextType === "customer") {
                        chat.contextId = await Customer_1.default.findById(chat.contextId).lean();
                    }
                }
                catch (err) {
                    console.error("Error populating contextId:", err);
                }
            }
        }
        // Calculate unread count for each chat and format lastMessage
        const chatsWithUnread = chats.map((chat) => {
            let unreadCount = 0;
            const unreadData = chat.unreadCount;
            if (unreadData instanceof Map) {
                unreadCount = unreadData.get(userId) || 0;
            }
            else if (Array.isArray(unreadData)) {
                const matched = unreadData.find(([key]) => key === userId);
                unreadCount = matched?.[1] || 0;
            }
            else if (unreadData && typeof unreadData === "object") {
                unreadCount = Number(unreadData[userId] || 0);
            }
            return {
                ...chat,
                myUnreadCount: unreadCount,
                // Format lastMessage as object for client compatibility
                lastMessage: chat.lastMessage ? {
                    message: chat.lastMessage,
                    createdAt: chat.lastMessageAt || chat.updatedAt
                } : null,
            };
        });
        res.status(200).json({
            success: true,
            data: chatsWithUnread,
        });
    }
    catch (error) {
        console.error("Error fetching chats:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching chats",
            error: error.message,
        });
    }
};
exports.getUserChats = getUserChats;
// Get chat by ID
const getChatById = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        const { chatId } = req.params;
        const chat = await Chat_1.default.findById(chatId)
            .lean();
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found",
            });
        }
        // Manually populate participants based on chat type
        const populatedParticipants = [];
        for (let i = 0; i < chat.participants.length; i++) {
            const participantId = chat.participants[i];
            const role = chat.participantRoles[i];
            if (role === "customer") {
                const customer = await Customer_1.default.findById(participantId).select("name email").lean();
                if (customer) {
                    populatedParticipants.push({ ...customer, role: "customer" });
                }
            }
            else {
                const user = await User_1.default.findById(participantId).select("name email role").lean();
                if (user) {
                    populatedParticipants.push(user);
                }
            }
        }
        chat.participants = populatedParticipants;
        // Manually populate contextId for non-general contexts
        if (chat.contextType && chat.contextType !== "general" && chat.contextId) {
            try {
                if (chat.contextType === "order") {
                    chat.contextId = await Order_1.default.findById(chat.contextId).lean();
                }
                else if (chat.contextType === "product") {
                    chat.contextId = await Product_1.default.findById(chat.contextId).lean();
                }
                else if (chat.contextType === "customer") {
                    chat.contextId = await Customer_1.default.findById(chat.contextId).lean();
                }
            }
            catch (err) {
                console.error("Error populating contextId:", err);
            }
        }
        // Check authorization
        const isParticipant = chat.participants.some((p) => p._id.toString() === userId);
        const isAdmin = userRole === "admin";
        if (!isParticipant && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }
        res.status(200).json({
            success: true,
            data: chat,
        });
    }
    catch (error) {
        console.error("Error fetching chat:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching chat",
            error: error.message,
        });
    }
};
exports.getChatById = getChatById;
// Get chat messages
const getChatMessages = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        const { chatId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        // Verify chat access
        const chat = await Chat_1.default.findById(chatId);
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found",
            });
        }
        const isParticipant = chat.participants.some((p) => p.toString() === userId);
        const isAdmin = userRole === "admin";
        if (!isParticipant && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const messages = await Message_1.default.find({ chatId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();
        // Manually populate contextId based on contextType
        const populatedMessages = await Promise.all(messages.map(async (message) => {
            if (message.contextType && message.contextId) {
                try {
                    if (message.contextType === "order") {
                        const order = await Order_1.default.findById(message.contextId)
                            .select("orderNumber status totalAmount")
                            .lean();
                        message.contextId = order;
                    }
                    else if (message.contextType === "product") {
                        const product = await Product_1.default.findById(message.contextId)
                            .select("name basePrice images")
                            .lean();
                        message.contextId = product;
                    }
                    else if (message.contextType === "customer") {
                        const customer = await Customer_1.default.findById(message.contextId)
                            .select("name email phone")
                            .lean();
                        message.contextId = customer;
                    }
                }
                catch (err) {
                    console.error(`Error populating contextId for message ${message._id}:`, err);
                }
            }
            return message;
        }));
        const total = await Message_1.default.countDocuments({ chatId });
        res.status(200).json({
            success: true,
            data: {
                messages: populatedMessages.reverse(), // Oldest first for display
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum),
                },
            },
        });
    }
    catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching messages",
            error: error.message,
        });
    }
};
exports.getChatMessages = getChatMessages;
// Send message (REST endpoint - Socket.IO will also handle this)
const sendMessage = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        const { chatId, text, attachments = [] } = req.body;
        if (!userId || !userRole) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!chatId || !text) {
            return res.status(400).json({
                success: false,
                message: "Chat ID and message text are required",
            });
        }
        // Verify chat access
        const chat = await Chat_1.default.findById(chatId);
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found",
            });
        }
        const isParticipant = chat.participants.some((p) => p.toString() === userId);
        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }
        // Get sender info
        let sender;
        if (chat.type === "external" && userRole === "customer") {
            sender = await Customer_1.default.findById(userId).select("name");
        }
        else {
            sender = await User_1.default.findById(userId).select("name");
        }
        // Create message
        const message = await Message_1.default.create({
            chatId,
            senderId: userId,
            senderRole: userRole,
            senderName: sender?.name || "Unknown",
            text,
            attachments,
            status: "sent",
            readBy: [userId],
        });
        // Update chat
        await Chat_1.default.findByIdAndUpdate(chatId, {
            lastMessage: text,
            lastMessageAt: new Date(),
        });
        res.status(201).json({
            success: true,
            data: message,
        });
    }
    catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({
            success: false,
            message: "Error sending message",
            error: error.message,
        });
    }
};
exports.sendMessage = sendMessage;
// Mark messages as read
const markMessagesAsRead = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { chatId } = req.params;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        // Verify chat access
        const chat = await Chat_1.default.findById(chatId);
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found",
            });
        }
        const isParticipant = chat.participants.some((p) => p.toString() === userId);
        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }
        // Update all unread messages
        await Message_1.default.updateMany({
            chatId,
            senderId: { $ne: userId },
            readBy: { $ne: userId },
        }, {
            $push: { readBy: userId },
            $set: { status: "seen" },
        });
        // Reset unread count for this user
        const unreadMap = chat.unreadCount || new Map();
        unreadMap.set(userId, 0);
        await Chat_1.default.findByIdAndUpdate(chatId, {
            unreadCount: unreadMap,
        });
        res.status(200).json({
            success: true,
            message: "Messages marked as read",
        });
    }
    catch (error) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({
            success: false,
            message: "Error marking messages as read",
            error: error.message,
        });
    }
};
exports.markMessagesAsRead = markMessagesAsRead;
// Get chat context (order/product details)
const getChatContext = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user?.userId;
        const chat = await Chat_1.default.findById(chatId);
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found",
            });
        }
        // Verify access
        const isParticipant = chat.participants.some((p) => p.toString() === userId);
        if (!isParticipant && req.user?.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }
        let contextData = null;
        if (chat.contextType && chat.contextId) {
            switch (chat.contextType) {
                case "order":
                    contextData = await Order_1.default.findById(chat.contextId)
                        .populate("items.product")
                        .lean();
                    break;
                case "product":
                    contextData = await Product_1.default.findById(chat.contextId).lean();
                    break;
                case "customer":
                    contextData = await Customer_1.default.findById(chat.contextId)
                        .select("-password")
                        .lean();
                    break;
            }
        }
        res.status(200).json({
            success: true,
            data: {
                contextType: chat.contextType,
                contextId: chat.contextId,
                contextData,
            },
        });
    }
    catch (error) {
        console.error("Error fetching chat context:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching chat context",
            error: error.message,
        });
    }
};
exports.getChatContext = getChatContext;
// Get all staff members for chat creation
const getStaffMembers = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { department } = req.query;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const filter = {
            _id: { $ne: userId },
            isActive: true,
        };
        // Filter by role if department is specified
        if (department) {
            switch (department) {
                case "sales":
                    filter.role = { $in: ["admin", "top_manager", "order_manager", "staff"] };
                    break;
                case "support":
                    filter.role = { $in: ["admin", "top_manager", "customer_manager", "staff"] };
                    break;
                case "inventory":
                    filter.role = { $in: ["admin", "top_manager", "inventory_manager", "staff"] };
                    break;
            }
        }
        const staff = await User_1.default.find(filter)
            .select("name email role")
            .sort({ name: 1 })
            .lean();
        res.status(200).json({
            success: true,
            data: staff,
        });
    }
    catch (error) {
        console.error("Error fetching staff members:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching staff members",
            error: error.message,
        });
    }
};
exports.getStaffMembers = getStaffMembers;
// Client-side: Create support chat
const createSupportChat = async (req, res) => {
    try {
        const customerId = req.user?.userId;
        const { message, orderId } = req.body;
        if (!customerId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        // Find an admin to assign
        const admin = await User_1.default.findOne({ role: "admin", isActive: true });
        if (!admin) {
            return res.status(500).json({
                success: false,
                message: "No admin available",
            });
        }
        // Check for existing support chat for this order
        let chat;
        if (orderId) {
            chat = await Chat_1.default.findOne({
                type: "external",
                participants: customerId,
                contextType: "order",
                contextId: orderId,
            });
        }
        // Create new chat if doesn't exist
        if (!chat) {
            chat = await Chat_1.default.create({
                type: "external",
                participants: [customerId, admin._id],
                participantRoles: ["customer", admin.role],
                isGroup: false,
                groupName: "Support",
                department: "support",
                contextType: orderId ? "order" : "general",
                contextId: orderId || null,
                createdBy: customerId,
                unreadCount: new Map(),
            });
        }
        // Send initial message if provided
        if (message) {
            // Get customer info
            const customer = await Customer_1.default.findById(customerId).select("name");
            await Message_1.default.create({
                chatId: chat._id,
                senderId: customerId,
                senderRole: "customer",
                senderName: customer?.name || "Customer",
                text: message,
                status: "sent",
                readBy: [customerId],
            });
            // Update chat
            await Chat_1.default.findByIdAndUpdate(chat._id, {
                lastMessage: message,
                lastMessageAt: new Date(),
            });
        }
        const populatedChat = await Chat_1.default.findById(chat._id).lean();
        // Manually populate participants based on roles
        const populatedParticipants = [];
        for (let i = 0; i < populatedChat.participants.length; i++) {
            const participantId = populatedChat.participants[i];
            const role = populatedChat.participantRoles[i];
            if (role === "customer") {
                const customer = await Customer_1.default.findById(participantId).select("name email").lean();
                if (customer) {
                    populatedParticipants.push({ ...customer, role: "customer" });
                }
            }
            else {
                const user = await User_1.default.findById(participantId).select("name email role").lean();
                if (user) {
                    populatedParticipants.push(user);
                }
            }
        }
        populatedChat.participants = populatedParticipants;
        // Manually populate contextId for non-general contexts
        if (populatedChat?.contextType && populatedChat.contextType !== "general" && populatedChat.contextId) {
            try {
                if (populatedChat.contextType === "order") {
                    populatedChat.contextId = await Order_1.default.findById(populatedChat.contextId).lean();
                }
                else if (populatedChat.contextType === "product") {
                    populatedChat.contextId = await Product_1.default.findById(populatedChat.contextId).lean();
                }
                else if (populatedChat.contextType === "customer") {
                    populatedChat.contextId = await Customer_1.default.findById(populatedChat.contextId).lean();
                }
            }
            catch (err) {
                console.error("Error populating contextId:", err);
            }
        }
        // Format lastMessage as object for client compatibility
        const responseData = {
            ...populatedChat,
            lastMessage: populatedChat.lastMessage ? {
                message: populatedChat.lastMessage,
                createdAt: populatedChat.lastMessageAt || populatedChat.updatedAt
            } : null,
        };
        res.status(201).json({
            success: true,
            data: responseData,
        });
    }
    catch (error) {
        console.error("Error creating support chat:", error);
        res.status(500).json({
            success: false,
            message: "Error creating support chat",
            error: error.message,
        });
    }
};
exports.createSupportChat = createSupportChat;
// Delete message
const deleteMessage = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        const { messageId } = req.params;
        if (!userId || !userRole) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        // Find the message
        const message = await Message_1.default.findById(messageId);
        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found",
            });
        }
        // Check if user is the sender or admin
        const isAdmin = userRole === "admin";
        const isSender = message.senderId.toString() === userId;
        if (!isAdmin && !isSender) {
            return res.status(403).json({
                success: false,
                message: "You can only delete your own messages",
            });
        }
        // Delete the message
        await Message_1.default.findByIdAndDelete(messageId);
        // Update chat's last message if this was the last message
        const chat = await Chat_1.default.findById(message.chatId);
        if (chat) {
            const lastMessage = await Message_1.default.findOne({ chatId: chat._id })
                .sort({ createdAt: -1 })
                .lean();
            if (lastMessage) {
                await Chat_1.default.findByIdAndUpdate(chat._id, {
                    lastMessage: lastMessage.text,
                    lastMessageAt: lastMessage.createdAt,
                });
            }
            else {
                await Chat_1.default.findByIdAndUpdate(chat._id, {
                    lastMessage: "",
                    lastMessageAt: null,
                });
            }
        }
        res.status(200).json({
            success: true,
            message: "Message deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting message:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting message",
            error: error.message,
        });
    }
};
exports.deleteMessage = deleteMessage;
/**
 * Delete a chat and all its messages
 */
const deleteChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
        }
        // Find the chat
        const chat = await Chat_1.default.findById(chatId);
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found",
            });
        }
        // Check if user is a participant or admin
        const isParticipant = chat.participants.some((p) => p.toString() === userId);
        const isAdmin = userRole === "admin";
        if (!isParticipant && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete this chat",
            });
        }
        // Delete all messages in the chat
        await Message_1.default.deleteMany({ chatId: chat._id });
        // Delete the chat
        await Chat_1.default.findByIdAndDelete(chatId);
        res.status(200).json({
            success: true,
            message: "Chat deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting chat:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting chat",
            error: error.message,
        });
    }
};
exports.deleteChat = deleteChat;
