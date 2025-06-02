const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ["user", "assistant"],
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const AgentConversationSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AgentTask", // Reference to the AgentTask model
      required: true,
      index: true,
    },
    userId: {
      // Denormalizing userId for easier querying of conversations by user
      type: String, // Clerk User ID
      required: true,
      index: true,
    },
    messages: [MessageSchema],
    context: {
      // Optional field for storing conversation context if needed beyond messages
      type: String,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    collection: "agentConversations",
  }
);

const AgentConversation =
  mongoose.models.AgentConversation ||
  mongoose.model("AgentConversation", AgentConversationSchema);

module.exports = AgentConversation;
