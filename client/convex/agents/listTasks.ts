import { v } from "convex/values";
import { query } from "../_generated/server";

export const listTasks = query({
  args: {
    userId: v.string(),
    courseInstanceId: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    )),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let tasksQuery = ctx.db
      .query("agentTasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));
    
    // Apply filters
    const tasks = await tasksQuery.collect();
    
    let filteredTasks = tasks;
    
    if (args.courseInstanceId) {
      filteredTasks = filteredTasks.filter(
        task => task.courseInstanceId === args.courseInstanceId
      );
    }
    
    if (args.status) {
      filteredTasks = filteredTasks.filter(
        task => task.status === args.status
      );
    }
    
    // Sort by creation time (newest first)
    filteredTasks.sort((a, b) => {
      const aTime = a._creationTime;
      const bTime = b._creationTime;
      return bTime - aTime;
    });
    
    // Apply pagination
    const limit = args.limit || 20;
    const paginatedTasks = filteredTasks.slice(0, limit);
    
    return {
      tasks: paginatedTasks,
      hasMore: filteredTasks.length > limit
    };
  },
});