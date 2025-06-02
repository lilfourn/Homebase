const mongoose = require("mongoose");

const AgentTemplateSchema = new mongoose.Schema(
  {
    userId: {
      // Clerk User ID. Optional: null for system templates, populated for user-created templates.
      type: String,
      index: true,
      default: null,
    },
    name: {
      type: String,
      required: true,
    },
    agentType: {
      // e.g., "note-taker", "researcher". Should match agentType in AgentTask.
      type: String,
      required: true,
    },
    description: {
      // Adding a description field, good for UI
      type: String,
      default: "",
    },
    config: {
      // Stores the specific configuration for this template.
      // e.g., { noteStyle: "outline", summaryLength: "detailed", promptOverride: "..." }
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: false, // Templates are private by default
      index: true,
    },
    // Consider adding usage count or rating if templates become a shared feature
    // lastUsedAt: { type: Date }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    collection: "agentTemplates",
  }
);

// Index for common queries
AgentTemplateSchema.index({ userId: 1, agentType: 1 });
AgentTemplateSchema.index({ isPublic: 1, agentType: 1 });

const AgentTemplate =
  mongoose.models.AgentTemplate ||
  mongoose.model("AgentTemplate", AgentTemplateSchema);

module.exports = AgentTemplate;
