const convexService = require('./convexService');
const Course = require('../models/course.model');
const User = require('../models/users.model');

class HybridDataService {
  /**
   * Note: Task data is stored in Convex and queried from frontend
   * This method is kept for future HTTP endpoint integration
   */
  async getAgentTaskWithFiles(taskId, userId) {
    // Frontend handles Convex queries directly
    // This method would be used if we implement Convex HTTP endpoints
    throw new Error('Task queries should be handled by frontend Convex hooks');
  }

  /**
   * Note: Task listing is handled by frontend Convex hooks
   * This method is kept for future HTTP endpoint integration
   */
  async listAgentTasksWithCourseInfo(params) {
    // Frontend handles Convex queries directly
    throw new Error('Task queries should be handled by frontend Convex hooks');
  }

  /**
   * Validates files exist in MongoDB before creating agent task
   */
  async validateFilesForTask(userId, fileIds) {
    try {
      const user = await User.findOne({ clerkUserId: userId });
      
      if (!user || !user.googleDriveFiles) {
        throw new Error('No files found for user');
      }

      const userFileIds = user.googleDriveFiles.map(f => f.fileId);
      const missingFiles = fileIds.filter(id => !userFileIds.includes(id));

      if (missingFiles.length > 0) {
        throw new Error(`Files not found: ${missingFiles.join(', ')}`);
      }

      // Return file metadata for the valid files
      return user.googleDriveFiles
        .filter(f => fileIds.includes(f.fileId))
        .map(file => ({
          id: file.fileId,
          name: file.fileName,
          mimeType: file.mimeType,
          size: file.size || 0
        }));
    } catch (error) {
      console.error('Error validating files:', error);
      throw error;
    }
  }

  /**
   * Validates course ownership before creating agent task
   */
  async validateCourseOwnership(userId, courseInstanceId) {
    try {
      const course = await Course.findOne({
        courseInstanceId,
        userId
      });

      if (!course) {
        throw new Error('Course not found or unauthorized');
      }

      return course;
    } catch (error) {
      console.error('Error validating course ownership:', error);
      throw error;
    }
  }

  /**
   * Gets user's monthly usage stats from MongoDB
   * Note: Actual task counts would come from Convex via frontend
   */
  async getUserUsageStats(userId) {
    try {
      // Get user's plan limits from MongoDB
      const user = await User.findOne({ clerkUserId: userId });
      const monthlyLimit = user?.subscription?.taskLimit || 100; // Free tier gets 100 tasks
      
      // For MVP, return hardcoded usage
      // In production, this would query from Convex or a usage collection
      const usedTasks = 0;

      return {
        userId,
        monthlyLimit,
        usedTasks,
        remainingTasks: monthlyLimit - usedTasks,
        resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        tier: user?.subscription?.tier || 'free'
      };
    } catch (error) {
      console.error('Error getting user usage stats:', error);
      throw error;
    }
  }
}

module.exports = new HybridDataService();