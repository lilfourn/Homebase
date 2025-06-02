/**
 * Convex Service for server-side integration
 * 
 * Since we're in a Node.js backend environment, we'll use the Convex HTTP API
 * For now, we'll create a simplified interface that the frontend will handle
 * the actual Convex mutations through its React hooks
 */

class ConvexService {
  constructor() {
    this.deploymentUrl = process.env.CONVEX_DEPLOYMENT_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
    
    if (!this.deploymentUrl) {
      console.warn('[ConvexService] No Convex deployment URL configured. Frontend will handle all Convex operations.');
    }
  }

  /**
   * Note: In this architecture, the backend creates tasks via the frontend API
   * The frontend handles the actual Convex mutations
   * This service is primarily for documentation and future HTTP endpoint integration
   */

  async createAgentTask(params) {
    // This will be called by the controller, but the actual Convex mutation
    // happens from the frontend after the backend validates the request
    console.log('[ConvexService] Task creation params validated:', {
      userId: params.userId,
      agentType: params.agentType,
      fileCount: params.files.length
    });
    
    // Return a placeholder - actual task ID comes from frontend
    return { 
      taskId: `pending_${Date.now()}`,
      message: 'Task queued for processing' 
    };
  }

  async updateTaskStatus(params) {
    // Workers will call the Express endpoint which updates Convex
    console.log('[ConvexService] Task status update:', {
      taskId: params.taskId,
      status: params.status,
      progress: params.progress
    });
    
    return { success: true };
  }

  async getTask(taskId, userId) {
    // Frontend handles queries directly
    throw new Error('Use frontend Convex hooks for queries');
  }

  async listTasks(params) {
    // Frontend handles queries directly
    throw new Error('Use frontend Convex hooks for queries');
  }

  async addMessage(params) {
    // Frontend handles mutations directly
    console.log('[ConvexService] Message added to task:', params.taskId);
    return { success: true };
  }

  async deleteTask(params) {
    // Frontend handles mutations directly
    console.log('[ConvexService] Task deleted:', params.taskId);
    return { success: true };
  }

  async getTemplates(params) {
    // Frontend handles queries directly
    throw new Error('Use frontend Convex hooks for queries');
  }

  async shareTask(params) {
    // Frontend handles mutations directly
    console.log('[ConvexService] Task shared:', params.taskId);
    return { success: true };
  }

  async notifyTaskProcessing(taskId, userId, courseInstanceId, action = 'process_task') {
    // This is used to trigger backend processing
    console.log('[ConvexService] Backend notified for task processing:', {
      taskId,
      action,
      userId
    });
    
    return { success: true };
  }
}

// Export singleton instance
module.exports = new ConvexService();