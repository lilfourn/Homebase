import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  agentTasks: defineTable({
    userId: v.string(),
    courseInstanceId: v.string(),
    taskName: v.string(),
    agentType: v.union(
      v.literal("note-taker"),
      v.literal("researcher"),
      v.literal("study-buddy"),
      v.literal("assignment")
    ),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    config: v.object({
      mode: v.string(),
      model: v.string(),
      customSettings: v.any()
    }),
    files: v.array(v.object({
      fileId: v.string(), // Reference to MongoDB
      fileName: v.string(),
      fileSize: v.number(),
      mimeType: v.string()
    })),
    progress: v.optional(v.number()), // 0-100
    result: v.optional(v.object({
      content: v.string(),
      format: v.string(),
      metadata: v.any()
    })),
    usage: v.optional(v.object({
      tokensUsed: v.number(),
      processingTime: v.number(),
      cost: v.number()
    })),
    error: v.optional(v.string()),
    completedAt: v.optional(v.number())
  })
    .index("by_user", ["userId"])
    .index("by_course", ["courseInstanceId"])
    .index("by_status", ["status"])
    .index("by_user_status", ["userId", "status"]),

  agentConversations: defineTable({
    taskId: v.id("agentTasks"),
    messages: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      timestamp: v.number()
    })),
    context: v.optional(v.string())
  })
    .index("by_task", ["taskId"]),

  agentTemplates: defineTable({
    userId: v.optional(v.string()), // null for system templates
    name: v.string(),
    agentType: v.string(),
    config: v.any(),
    isPublic: v.boolean()
  })
    .index("by_user", ["userId"])
    .index("public_templates", ["isPublic"])
});