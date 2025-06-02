import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const deleteTask = mutation({
  args: {
    taskId: v.id("agentTasks"),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    
    if (!task) {
      throw new Error("Task not found");
    }
    
    // Validate user owns this task
    if (task.userId !== args.userId) {
      throw new Error("Unauthorized to delete this task");
    }
    
    // Delete associated conversations
    const conversations = await ctx.db
      .query("agentConversations")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    
    for (const conversation of conversations) {
      await ctx.db.delete(conversation._id);
    }
    
    // Update user usage stats if task was completed
    if (task.status === "completed" && task.usage) {
      // In a full implementation, we'd track monthly usage
      // For now, we'll just log the freed usage
      console.log(`[Convex] Freed usage for user ${args.userId}:`, {
        tokensUsed: task.usage.tokensUsed,
        cost: task.usage.cost
      });
    }
    
    // Delete the task
    await ctx.db.delete(args.taskId);
    
    return { success: true };
  },
});