import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export const updateTaskStatus = mutation({
  args: {
    taskId: v.id("agentTasks"),
    status: v.optional(v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    )),
    progress: v.optional(v.number()),
    result: v.optional(v.object({
      content: v.string(),
      format: v.string(),
      metadata: v.any()
    })),
    error: v.optional(v.string()),
    usage: v.optional(v.object({
      tokensUsed: v.number(),
      processingTime: v.number(),
      cost: v.number()
    }))
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    const updates: any = {};
    
    if (args.status !== undefined) {
      updates.status = args.status;
    }
    
    if (args.progress !== undefined) {
      updates.progress = args.progress;
    }
    
    if (args.result !== undefined) {
      updates.result = args.result;
    }
    
    if (args.error !== undefined) {
      updates.error = args.error;
    }
    
    if (args.usage !== undefined) {
      updates.usage = args.usage;
    }
    
    if (args.status === "completed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.taskId, updates);
    
    return { success: true };
  },
});