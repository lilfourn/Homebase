import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { api } from "../_generated/api";

export const createTask = mutation({
  args: {
    userId: v.string(),
    courseInstanceId: v.string(),
    taskName: v.string(),
    agentType: v.union(
      v.literal("note-taker"),
      v.literal("researcher"),
      v.literal("study-buddy"),
      v.literal("assignment")
    ),
    config: v.object({
      mode: v.string(),
      model: v.string(),
      customSettings: v.any()
    }),
    files: v.array(v.object({
      fileId: v.string(),
      fileName: v.string(),
      fileSize: v.number(),
      mimeType: v.string()
    }))
  },
  handler: async (ctx, args) => {
    // Validate user permissions (in a real app, check against auth)
    if (!args.userId) {
      throw new Error("User authentication required");
    }

    // Create the task with initial status
    const taskId = await ctx.db.insert("agentTasks", {
      userId: args.userId,
      courseInstanceId: args.courseInstanceId,
      taskName: args.taskName,
      agentType: args.agentType,
      status: "queued",
      config: args.config,
      files: args.files,
      progress: 0
    });

    // Trigger background processing by scheduling an action
    // The backend will pick this up via polling or HTTP action
    await ctx.scheduler.runAfter(0, api.agents.internal.notifyBackend, {
      taskId,
      userId: args.userId,
      courseInstanceId: args.courseInstanceId,
      action: "process_task"
    });

    return { taskId, success: true };
  },
});