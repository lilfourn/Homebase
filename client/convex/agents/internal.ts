import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Internal action to notify backend about new tasks
 * This can be used to trigger processing via HTTP or other mechanisms
 */
export const notifyBackend = internalAction({
  args: {
    taskId: v.id("agentTasks"),
    userId: v.string(),
    courseInstanceId: v.string(),
    action: v.string()
  },
  handler: async (ctx, args) => {
    // In production, this could:
    // 1. Send an HTTP request to the backend
    // 2. Add to a processing queue
    // 3. Send a notification via another service
    
    // For now, we'll just log the action
    console.log(`[Convex] Backend notification: ${args.action} for task ${args.taskId}`);
    
    // The backend will poll for queued tasks or receive this via HTTP action
    return { success: true };
  },
});