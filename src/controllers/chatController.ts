import { Response } from "express";
import mongoose from "mongoose";
import Chat from "../models/Chat";
import Message from "../models/Message";
import User from "../models/User";
import Customer from "../models/Customer";
import Order from "../models/Order";
import Product from "../models/Product";
import { AuthRequest } from "../middlewares/auth";

// Create or get one-to-one chat
export const createOrGetChat = async (req: AuthRequest, res: Response) => {
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
    const existingChat = await Chat.findOne({
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
    let participantRole: string;

    if (type === "external") {
      participant = await Customer.findById(participantId).select("name email");
      participantRole = "customer";
    } else {
      participant = await User.findById(participantId).select("name email role");
      participantRole = (participant as any)?.role || "staff";
    }

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Participant not found",
      });
    }

    // Create new chat
    const chat = await Chat.create({
      type,
      participants: [userId, participantId],
      participantRoles: [userRole, participantRole],
      isGroup: false,
      contextType: contextType || "general",
      contextId: contextId || null,
      createdBy: userId,
      unreadCount: new Map(),
    });

    const populatedChat = await Chat.findById(chat._id)
      .populate("participants", "name email role")
      .lean();

    res.status(201).json({
      success: true,
      data: populatedChat,
    });
  } catch (error: any) {
    console.error("Error creating/getting chat:", error);
    res.status(500).json({
      success: false,
      message: "Error creating/getting chat",
      error: error.message,
    });
  }
};

// Create group chat (internal only)
export const createGroupChat = async (req: AuthRequest, res: Response) => {
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
    const participants = await User.find({
      _id: { $in: participantIds },
    }).select("role");

    const participantRoles = participants.map((p) => p.role);

    // Create group chat
    const chat = await Chat.create({
      type: "internal",
      participants: participantIds,
      participantRoles,
      isGroup: true,
      groupName,
      department: department || null,
      createdBy: userId,
      unreadCount: new Map(),
    });

    const populatedChat = await Chat.findById(chat._id)
      .populate("participants", "name email role")
      .lean();

    res.status(201).json({
      success: true,
      data: populatedChat,
    });
  } catch (error: any) {
    console.error("Error creating group chat:", error);
    res.status(500).json({
      success: false,
      message: "Error creating group chat",
      error: error.message,
    });
  }
};

// Get user's chats
export const getUserChats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { type, isGroup } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const filter: any = {
      participants: userId,
    };

    if (type && ["internal", "external"].includes(type as string)) {
      filter.type = type;
    }

    // Filter by isGroup if provided
    if (isGroup !== undefined) {
      filter.isGroup = isGroup === "true";
    }

    const chats = await Chat.find(filter)
      .sort({ lastMessageAt: -1 })
      .lean();

    // Manually populate participants based on chat type
    for (let chat of chats as any[]) {
      const populatedParticipants = [];
      
      for (let i = 0; i < chat.participants.length; i++) {
        const participantId = chat.participants[i];
        const role = chat.participantRoles[i];
        
        if (role === "customer") {
          const customer = await Customer.findById(participantId).select("name email").lean();
          if (customer) {
            populatedParticipants.push({ ...customer, role: "customer" });
          }
        } else {
          const user = await User.findById(participantId).select("name email role").lean();
          if (user) {
            populatedParticipants.push(user);
          }
        }
      }
      
      chat.participants = populatedParticipants;
    }

    // Manually populate contextId for non-general contexts
    for (let chat of chats as any[]) {
      if (chat.contextType && chat.contextType !== "general" && chat.contextId) {
        try {
          if (chat.contextType === "order") {
            chat.contextId = await Order.findById(chat.contextId).lean();
          } else if (chat.contextType === "product") {
            chat.contextId = await Product.findById(chat.contextId).lean();
          } else if (chat.contextType === "customer") {
            chat.contextId = await Customer.findById(chat.contextId).lean();
          }
        } catch (err) {
          console.error("Error populating contextId:", err);
        }
      }
    }

    // Calculate unread count for each chat
    const chatsWithUnread = chats.map((chat: any) => {
      const unreadCount = chat.unreadCount?.get?.(userId) || 0;
      return {
        ...chat,
        myUnreadCount: unreadCount,
      };
    });

    res.status(200).json({
      success: true,
      data: chatsWithUnread,
    });
  } catch (error: any) {
    console.error("Error fetching chats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching chats",
      error: error.message,
    });
  }
};

// Get chat by ID
export const getChatById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId)
      .lean();

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    // Manually populate participants based on chat type
    const populatedParticipants = [];
    for (let i = 0; i < (chat as any).participants.length; i++) {
      const participantId = (chat as any).participants[i];
      const role = (chat as any).participantRoles[i];
      
      if (role === "customer") {
        const customer = await Customer.findById(participantId).select("name email").lean();
        if (customer) {
          populatedParticipants.push({ ...customer, role: "customer" });
        }
      } else {
        const user = await User.findById(participantId).select("name email role").lean();
        if (user) {
          populatedParticipants.push(user);
        }
      }
    }
    (chat as any).participants = populatedParticipants;

    // Manually populate contextId for non-general contexts
    if ((chat as any).contextType && (chat as any).contextType !== "general" && (chat as any).contextId) {
      try {
        if ((chat as any).contextType === "order") {
          (chat as any).contextId = await Order.findById((chat as any).contextId).lean();
        } else if ((chat as any).contextType === "product") {
          (chat as any).contextId = await Product.findById((chat as any).contextId).lean();
        } else if ((chat as any).contextType === "customer") {
          (chat as any).contextId = await Customer.findById((chat as any).contextId).lean();
        }
      } catch (err) {
        console.error("Error populating contextId:", err);
      }
    }

    // Check authorization
    const isParticipant = (chat as any).participants.some(
      (p: any) => p._id.toString() === userId
    );

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
  } catch (error: any) {
    console.error("Error fetching chat:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching chat",
      error: error.message,
    });
  }
};

// Get chat messages
export const getChatMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify chat access
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId
    );
    const isAdmin = userRole === "admin";

    if (!isParticipant && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const messages = await Message.find({ chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Manually populate contextId based on contextType
    const populatedMessages = await Promise.all(
      messages.map(async (message: any) => {
        if (message.contextType && message.contextId) {
          try {
            if (message.contextType === "order") {
              const order = await Order.findById(message.contextId)
                .select("orderNumber status totalAmount")
                .lean();
              message.contextId = order;
            } else if (message.contextType === "product") {
              const product = await Product.findById(message.contextId)
                .select("name basePrice images")
                .lean();
              message.contextId = product;
            } else if (message.contextType === "customer") {
              const customer = await Customer.findById(message.contextId)
                .select("name email phone")
                .lean();
              message.contextId = customer;
            }
          } catch (err) {
            console.error(`Error populating contextId for message ${message._id}:`, err);
          }
        }
        return message;
      })
    );

    const total = await Message.countDocuments({ chatId });

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
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching messages",
      error: error.message,
    });
  }
};

// Send message (REST endpoint - Socket.IO will also handle this)
export const sendMessage = async (req: AuthRequest, res: Response) => {
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
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Get sender info
    let sender;
    if (chat.type === "external" && userRole === "customer") {
      sender = await Customer.findById(userId).select("name");
    } else {
      sender = await User.findById(userId).select("name");
    }

    // Create message
    const message = await Message.create({
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
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: text,
      lastMessageAt: new Date(),
    });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    console.error("Error sending message:", error);
    res.status(500).json({
      success: false,
      message: "Error sending message",
      error: error.message,
    });
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req: AuthRequest, res: Response) => {
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
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Update all unread messages
    await Message.updateMany(
      {
        chatId,
        senderId: { $ne: userId },
        readBy: { $ne: userId },
      },
      {
        $push: { readBy: userId },
        $set: { status: "seen" },
      }
    );

    // Reset unread count for this user
    const unreadMap = chat.unreadCount || new Map();
    unreadMap.set(userId, 0);
    await Chat.findByIdAndUpdate(chatId, {
      unreadCount: unreadMap,
    });

    res.status(200).json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error: any) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({
      success: false,
      message: "Error marking messages as read",
      error: error.message,
    });
  }
};

// Get chat context (order/product details)
export const getChatContext = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.userId;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    // Verify access
    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId
    );

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
          contextData = await Order.findById(chat.contextId)
            .populate("items.product")
            .lean();
          break;
        case "product":
          contextData = await Product.findById(chat.contextId).lean();
          break;
        case "customer":
          contextData = await Customer.findById(chat.contextId)
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
  } catch (error: any) {
    console.error("Error fetching chat context:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching chat context",
      error: error.message,
    });
  }
};

// Get all staff members for chat creation
export const getStaffMembers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { department } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const filter: any = {
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

    const staff = await User.find(filter)
      .select("name email role")
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (error: any) {
    console.error("Error fetching staff members:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching staff members",
      error: error.message,
    });
  }
};

// Client-side: Create support chat
export const createSupportChat = async (req: AuthRequest, res: Response) => {
  try {
    const customerId = req.user?.userId;
    const { message, orderId } = req.body;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Initial message is required",
      });
    }

    // Find an admin to assign
    const admin = await User.findOne({ role: "admin", isActive: true });
    if (!admin) {
      return res.status(500).json({
        success: false,
        message: "No admin available",
      });
    }

    // Check for existing support chat for this order
    let chat;
    if (orderId) {
      chat = await Chat.findOne({
        type: "external",
        participants: customerId,
        contextType: "order",
        contextId: orderId,
      });
    }

    // Create new chat if doesn't exist
    if (!chat) {
      chat = await Chat.create({
        type: "external",
        participants: [customerId, admin._id],
        participantRoles: ["customer", admin.role],
        isGroup: false,
        contextType: orderId ? "order" : "general",
        contextId: orderId || null,
        createdBy: customerId,
        unreadCount: new Map(),
      });
    }

    // Get customer info
    const customer = await Customer.findById(customerId).select("name");

    // Send initial message
    await Message.create({
      chatId: chat._id,
      senderId: customerId,
      senderRole: "customer",
      senderName: customer?.name || "Customer",
      text: message,
      status: "sent",
      readBy: [customerId],
    });

    // Update chat
    await Chat.findByIdAndUpdate(chat._id, {
      lastMessage: message,
      lastMessageAt: new Date(),
    });

    const populatedChat = await Chat.findById(chat._id)
      .populate("participants", "name email")
      .lean();

    // Manually populate contextId for non-general contexts
    if ((populatedChat as any)?.contextType && (populatedChat as any).contextType !== "general" && (populatedChat as any).contextId) {
      try {
        if ((populatedChat as any).contextType === "order") {
          (populatedChat as any).contextId = await Order.findById((populatedChat as any).contextId).lean();
        } else if ((populatedChat as any).contextType === "product") {
          (populatedChat as any).contextId = await Product.findById((populatedChat as any).contextId).lean();
        } else if ((populatedChat as any).contextType === "customer") {
          (populatedChat as any).contextId = await Customer.findById((populatedChat as any).contextId).lean();
        }
      } catch (err) {
        console.error("Error populating contextId:", err);
      }
    }

    res.status(201).json({
      success: true,
      data: populatedChat,
    });
  } catch (error: any) {
    console.error("Error creating support chat:", error);
    res.status(500).json({
      success: false,
      message: "Error creating support chat",
      error: error.message,
    });
  }
};

// Delete message
export const deleteMessage = async (req: AuthRequest, res: Response) => {
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
    const message = await Message.findById(messageId);
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
    await Message.findByIdAndDelete(messageId);

    // Update chat's last message if this was the last message
    const chat = await Chat.findById(message.chatId);
    if (chat) {
      const lastMessage = await Message.findOne({ chatId: chat._id })
        .sort({ createdAt: -1 })
        .lean();

      if (lastMessage) {
        await Chat.findByIdAndUpdate(chat._id, {
          lastMessage: lastMessage.text,
          lastMessageAt: lastMessage.createdAt,
        });
      } else {
        await Chat.findByIdAndUpdate(chat._id, {
          lastMessage: "",
          lastMessageAt: null,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting message:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting message",
      error: error.message,
    });
  }
};

