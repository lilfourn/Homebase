import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

/**
 * HTTP endpoint for backend services to update task status
 * This allows Express backend to update Convex tasks after processing
 * 
 * Note: This is an HTTP action, not a webhook. Convex uses real-time
 * subscriptions for most updates, but HTTP actions are useful for
 * server-to-server communication from Express to Convex.
 */
http.route({
  path: "/api/updateTaskStatus",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Verify the request is from our backend
    const authHeader = request.headers.get("Authorization");
    const expectedToken = process.env.BACKEND_API_SECRET;
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const body = await request.json();
      const { 
        taskId, 
        status, 
        progress, 
        result, 
        error, 
        usage 
      } = body as {
        taskId: string;
        status?: "queued" | "processing" | "completed" | "failed";
        progress?: number;
        result?: {
          content: string;
          format: string;
          metadata: any;
        };
        error?: string;
        usage?: {
          tokensUsed: number;
          processingTime: number;
          cost: number;
        };
      };

      // Update the task using the mutation
      await ctx.runMutation(api.agents.updateTaskStatus, {
        taskId: taskId as Id<"agentTasks">,
        status,
        progress,
        result,
        error,
        usage
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("[HTTP updateTaskStatus] Error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to update task status" }), 
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }),
});

export default http;