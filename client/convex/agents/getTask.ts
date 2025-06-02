import { v } from "convex/values";
import { query } from "../_generated/server";

export const getTask = query({
  args: {
    taskId: v.id("agentTasks"),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    
    if (!task) {
      return null;
    }
    
    // Validate user access
    if (task.userId !== args.userId) {
      throw new Error("Unauthorized access to task");
    }
    
    // Get conversation history if exists
    const conversation = await ctx.db
      .query("agentConversations")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .first();
    
    return {
      ...task,
      _id: args.taskId,
      conversation: conversation?.messages || []
    };
  },
});