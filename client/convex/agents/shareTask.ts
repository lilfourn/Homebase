import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export const shareTask = mutation({
  args: {
    taskId: v.id("agentTasks"),
    userId: v.string(),
    shareSettings: v.object({
      isPublic: v.boolean(),
      allowComments: v.optional(v.boolean()),
      expiresAt: v.optional(v.number()), // Timestamp when share expires
      sharedWith: v.optional(v.array(v.string())) // Specific user IDs to share with
    })
  },
  handler: async (ctx, args) => {
    // Verify the task exists and belongs to the user
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }
    
    if (task.userId !== args.userId) {
      throw new Error("Unauthorized to share this task");
    }
    
    // Only allow sharing of completed tasks
    if (task.status !== "completed") {
      throw new Error("Can only share completed tasks");
    }
    
    // Generate a share token (in production, use a proper token generator)
    const shareToken = `share_${args.taskId}_${Date.now()}`;
    
    // Store share settings (in a full implementation, this would be a separate table)
    const shareData = {
      taskId: args.taskId,
      userId: args.userId,
      shareToken,
      ...args.shareSettings,
      createdAt: Date.now()
    };
    
    // For now, we'll store share settings in the task itself
    // In production, use a separate shares table
    await ctx.db.patch(args.taskId, {
      shareSettings: shareData
    } as any);
    
    // If making public, optionally create a template from it
    if (args.shareSettings.isPublic && task.config) {
      const templateName = `${task.taskName} (Shared by User)`;
      
      // Check if template already exists
      const existingTemplate = await ctx.db
        .query("agentTemplates")
        .filter((q) => 
          q.and(
            q.eq(q.field("name"), templateName),
            q.eq(q.field("userId"), args.userId)
          )
        )
        .first();
      
      if (!existingTemplate) {
        await ctx.db.insert("agentTemplates", {
          userId: args.userId,
          name: templateName,
          agentType: task.agentType,
          config: task.config,
          isPublic: true
        });
      }
    }
    
    return { 
      success: true,
      shareToken,
      shareUrl: `/shared/${shareToken}` // Frontend will construct full URL
    };
  },
});