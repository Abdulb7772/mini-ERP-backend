import { Server as SocketIOServer, Socket } from "socket.io";
import { verifyToken } from "../utils/jwt";
import Chat from "../models/Chat";
import Message from "../models/Message";
import User from "../models/User";
import Customer from "../models/Customer";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  userName?: string;
}

// Track online users
const onlineUsers = new Map<string, string>(); // userId -> socketId
const typingUsers = new Map<string, Set<string>>(); // chatId -> Set of userIds

export const initializeSocketIO = (io: SocketIOServer) => {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;

      // Get user name
      let user;
      if (decoded.role === "customer") {
        user = await Customer.findById(decoded.userId).select("name");
      } else {
        user = await User.findById(decoded.userId).select("name");
      }

      socket.userName = user?.name || "Unknown";

      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    const userRole = socket.userRole!;
    const userName = socket.userName!;

    console.log(`✅ User connected: ${userName} (${userId}) [${userRole}]`);

    // Track online user
    onlineUsers.set(userId, socket.id);

    // Emit online status to all connected users
    io.emit("user:online", { userId, userName, userRole });

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Join all user's chats
    Chat.find({ participants: userId })
      .select("_id")
      .lean()
      .then((chats) => {
        chats.forEach((chat) => {
          socket.join(`chat:${chat._id}`);
        });
      });

    // Handle joining a specific chat
    socket.on("chat:join", async (chatId: string) => {
      try {
        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit("error", { message: "Chat not found" });
          return;
        }

        // Verify participant
        const isParticipant = chat.participants.some(
          (p) => p.toString() === userId
        );
        const isAdmin = userRole === "admin";

        if (!isParticipant && !isAdmin) {
          socket.emit("error", { message: "Access denied" });
          return;
        }

        socket.join(`chat:${chatId}`);
        console.log(`User ${userName} joined chat ${chatId}`);

        // Emit success
        socket.emit("chat:joined", { chatId });
      } catch (error: any) {
        console.error("Error joining chat:", error);
        socket.emit("error", { message: "Error joining chat" });
      }
    });

    // Handle leaving a chat
    socket.on("chat:leave", (chatId: string) => {
      socket.leave(`chat:${chatId}`);
      console.log(`User ${userName} left chat ${chatId}`);
    });

    // Handle sending a message
    socket.on(
      "message:send",
      async (data: {
        chatId: string;
        text: string;
        attachments?: string[];
        contextType?: string;
        contextId?: string;
      }) => {
        try {
          const { chatId, text, attachments = [], contextType, contextId } = data;

          // Allow empty text if there's an attachment
          if (!chatId || (!text && !contextType)) {
            socket.emit("error", { message: "Invalid message data" });
            return;
          }

          // Verify chat access
          const chat = await Chat.findById(chatId);
          if (!chat) {
            socket.emit("error", { message: "Chat not found" });
            return;
          }

          const isParticipant = chat.participants.some(
            (p) => p.toString() === userId
          );

          if (!isParticipant) {
            socket.emit("error", { message: "Access denied" });
            return;
          }

          // Create message with optional context
          const messageData: any = {
            chatId,
            senderId: userId,
            senderRole: userRole,
            senderName: userName,
            text: text || "", // Allow empty text for attachments
            attachments,
            status: "sent",
            readBy: [userId],
          };
          
          // Add context if provided
          if (contextType && contextId) {
            messageData.contextType = contextType;
            messageData.contextId = contextId;
          }
          
          const message = await Message.create(messageData);

          // Populate contextId if present
          let messageToEmit: any = message.toObject();
          if (contextType && contextId) {
            try {
              const Order = require("../models/Order").default;
              const Product = require("../models/Product").default;
              
              if (contextType === "order") {
                const order = await Order.findById(contextId)
                  .select("orderNumber status totalAmount items")
                  .populate("items.productId", "name")
                  .lean();
                if (order) messageToEmit.contextId = order;
              } else if (contextType === "product") {
                const product = await Product.findById(contextId)
                  .select("name price images stock")
                  .lean();
                if (product) messageToEmit.contextId = product;
              } else if (contextType === "customer") {
                const customer = await Customer.findById(contextId)
                  .select("name email phone")
                  .lean();
                if (customer) messageToEmit.contextId = customer;
              }
            } catch (err) {
              console.error("Error populating contextId:", err);
            }
          }

          // Determine lastMessage text
          let lastMessageText = text;
          if (!text && contextType) {
            if (contextType === "order") {
              lastMessageText = "📦 Sent an order";
            } else if (contextType === "product") {
              lastMessageText = "🏷️ Sent a product";
            } else if (contextType === "customer") {
              lastMessageText = "👤 Sent a customer reference";
            } else {
              lastMessageText = "📎 Sent an attachment";
            }
          }

          // Update chat
          const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            {
              lastMessage: lastMessageText,
              lastMessageAt: new Date(),
            },
            { new: true }
          );

          // Increment unread count for other participants
          const unreadMap = updatedChat?.unreadCount || new Map();
          chat.participants.forEach((participantId) => {
            const pid = participantId.toString();
            if (pid !== userId) {
              const currentCount = unreadMap.get(pid) || 0;
              unreadMap.set(pid, currentCount + 1);
            }
          });

          await Chat.findByIdAndUpdate(chatId, {
            unreadCount: unreadMap,
          });

          // Emit message to all participants in the chat room
          io.to(`chat:${chatId}`).emit("message:new", {
            chatId,
            message: messageToEmit,
          });

          // Emit chat update to all participants
          chat.participants.forEach((participantId) => {
            io.to(`user:${participantId}`).emit("chat:updated", {
              chatId,
              lastMessage: lastMessageText,
              lastMessageAt: new Date(),
            });
          });

          console.log(`Message sent in chat ${chatId} by ${userName}`);
        } catch (error: any) {
          console.error("Error sending message:", error);
          socket.emit("error", { message: "Error sending message" });
        }
      }
    );

    // Handle typing indicator
    socket.on("typing:start", (chatId: string) => {
      if (!typingUsers.has(chatId)) {
        typingUsers.set(chatId, new Set());
      }
      typingUsers.get(chatId)!.add(userId);

      socket.to(`chat:${chatId}`).emit("typing:update", {
        chatId,
        userId,
        userName,
        isTyping: true,
      });
    });

    socket.on("typing:stop", (chatId: string) => {
      if (typingUsers.has(chatId)) {
        typingUsers.get(chatId)!.delete(userId);
      }

      socket.to(`chat:${chatId}`).emit("typing:update", {
        chatId,
        userId,
        userName,
        isTyping: false,
      });
    });

    // Handle message read status
    socket.on("message:read", async (data: { chatId: string }) => {
      try {
        const { chatId } = data;

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

        // Reset unread count
        const chat = await Chat.findById(chatId);
        if (chat) {
          const unreadMap = chat.unreadCount || new Map();
          unreadMap.set(userId, 0);
          await Chat.findByIdAndUpdate(chatId, {
            unreadCount: unreadMap,
          });
        }

        // Notify other participants that messages were read
        socket.to(`chat:${chatId}`).emit("messages:read", {
          chatId,
          userId,
          userName,
        });
      } catch (error: any) {
        console.error("Error marking messages as read:", error);
      }
    });

    // Handle message delivered status
    socket.on("message:delivered", async (messageId: string) => {
      try {
        await Message.findByIdAndUpdate(messageId, {
          status: "delivered",
        });

        const message = await Message.findById(messageId);
        if (message) {
          io.to(`chat:${message.chatId}`).emit("message:status", {
            messageId,
            status: "delivered",
          });
        }
      } catch (error: any) {
        console.error("Error updating message status:", error);
      }
    });

    // Get online users
    socket.on("users:online", () => {
      const onlineUsersList = Array.from(onlineUsers.keys());
      socket.emit("users:online:list", onlineUsersList);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${userName} (${userId})`);

      // Remove from online users
      onlineUsers.delete(userId);

      // Remove from typing indicators
      typingUsers.forEach((users, chatId) => {
        if (users.has(userId)) {
          users.delete(userId);
          io.to(`chat:${chatId}`).emit("typing:update", {
            chatId,
            userId,
            userName,
            isTyping: false,
          });
        }
      });

      // Emit offline status
      io.emit("user:offline", { userId, userName });
    });
  });

  console.log("✅ Socket.IO initialized successfully");

  return io;
};

// Helper function to emit to specific user
export const emitToUser = (io: SocketIOServer, userId: string, event: string, data: any) => {
  io.to(`user:${userId}`).emit(event, data);
};

// Helper function to emit to specific chat
export const emitToChat = (io: SocketIOServer, chatId: string, event: string, data: any) => {
  io.to(`chat:${chatId}`).emit(event, data);
};
