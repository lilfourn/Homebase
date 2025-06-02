import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { api } from "../_generated/api";

export const addMessage = mutation({
  args: {
    taskId: v.id("agentTasks"),
    userId: v.string(),
    message: v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string()
    })
  },
  handler: async (ctx, args) => {
    // Verify the task exists and belongs to the user
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }
    
    if (task.userId !== args.userId) {
      throw new Error("Unauthorized to add messages to this task");
    }
    
    // Check if conversation exists
    const existingConversation = await ctx.db
      .query("agentConversations")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .first();
    
    const messageWithTimestamp = {
      ...args.message,
      timestamp: Date.now()
    };
    
    if (existingConversation) {
      // Append to existing conversation
      await ctx.db.patch(existingConversation._id, {
        messages: [...existingConversation.messages, messageWithTimestamp]
      });
    } else {
      // Create new conversation
      await ctx.db.insert("agentConversations", {
        taskId: args.taskId,
        messages: [messageWithTimestamp],
        context: undefined
      });
    }
    
    // If user message, mark task as needing processing
    if (args.message.role === "user" && task.status === "completed") {
      await ctx.db.patch(args.taskId, {
        status: "processing"
      });
      
      // Notify backend to process follow-up
      await ctx.scheduler.runAfter(0, api.agents.internal.notifyBackend, {
        taskId: args.taskId,
        userId: args.userId,
        courseInstanceId: task.courseInstanceId,
        action: "process_followup"
      });
    }
    
    return { success: true };
  },
});