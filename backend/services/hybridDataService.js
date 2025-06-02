// const convexService = require("./convexService");
const Course = require("../models/course.model");
const User = require("../models/users.model");

// TEMPORARY: In-memory store for task usage for demonstration.
// Replace with actual database logic (e.g., in User model in MongoDB).
const mockUserTaskCounts = {};

class HybridDataService {
  /**
   * Note: Task data is stored in Convex and queried from frontend
   * This method is kept for future HTTP endpoint integration
   */
  async getAgentTaskWithFiles(taskId, userId) {
    // Frontend handles Convex queries directly
    // This method would be used if we implement Convex HTTP endpoints
    throw new Error("Task queries should be handled by frontend Convex hooks");
  }

  /**
   * Note: Task listing is handled by frontend Convex hooks
   * This method is kept for future HTTP endpoint integration
   */
  async listAgentTasksWithCourseInfo(params) {
    // Frontend handles Convex queries directly
    throw new Error("Task queries should be handled by frontend Convex hooks");
  }

  /**
   * Validates files exist in MongoDB before creating agent task
   */
  async validateFilesForTask(userId, fileIds) {
    try {
      const user = await User.findOne({ userId: userId });

      if (!user) {
        console.warn(
          `[HybridDataService] User not found for clerkUserId: ${userId}`
        );
        throw new Error("User not found, so no files available.");
      }

      if (!user.googleDriveFiles || user.googleDriveFiles.length === 0) {
        console.warn(
          `[HybridDataService] User ${userId} found, but has no googleDriveFiles or the array is empty.`
        );
        if (fileIds && fileIds.length > 0) {
          throw new Error(
            "User has no Google Drive files synced to check against."
          );
        }
        return [];
      }

      const userFileIds = user.googleDriveFiles.map((f) => f.fileId);
      const missingFiles = fileIds.filter((id) => !userFileIds.includes(id));

      if (missingFiles.length > 0) {
        throw new Error(`Files not found: ${missingFiles.join(", ")}`);
      }

      // Return file metadata for the valid files
      return user.googleDriveFiles
        .filter((f) => fileIds.includes(f.fileId))
        .map((file) => ({
          id: file.fileId,
          name: file.fileName,
          mimeType: file.mimeType,
          size: file.size || 0,
        }));
    } catch (error) {
      console.error("Error validating files:", error);
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
        userId,
      });

      if (!course) {
        throw new Error("Course not found or unauthorized");
      }

      return course;
    } catch (error) {
      console.error("Error validating course ownership:", error);
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
      // TODO: Actual plan limits should come from user.subscription or a dedicated plans collection
      const monthlyLimit = user?.subscription?.taskLimit || 100; // Default to 100 tasks

      // TEMPORARY: Use mock task count
      const usedTasks = mockUserTaskCounts[userId] || 0;
      // TODO: Implement proper monthly reset logic for task counts.
      // For now, remainingTasks could go negative if usedTasks > monthlyLimit without a reset.

      return {
        userId,
        monthlyLimit,
        usedTasks,
        remainingTasks: Math.max(0, monthlyLimit - usedTasks), // Ensure remaining doesn't go below 0 for display
        resetDate: new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          1
        ), // Placeholder next month
        tier: user?.subscription?.tier || "free",
      };
    } catch (error) {
      console.error("Error getting user usage stats:", error);
      throw error;
    }
  }

  /**
   * Increments the task usage count for a user.
   * TEMPORARY: Uses an in-memory mock. Replace with database update.
   */
  async incrementUserTaskCount(userId) {
    try {
      if (!userId) {
        throw new Error("User ID is required to increment task count.");
      }
      // TEMPORARY: Increment in-memory mock count
      mockUserTaskCounts[userId] = (mockUserTaskCounts[userId] || 0) + 1;
      console.log(
        `[HybridDataService] Incremented task count for user ${userId}. New mock count: ${mockUserTaskCounts[userId]}`
      );
      // TODO: Replace with actual database update:
      // await User.updateOne({ clerkUserId: userId }, { $inc: { tasksUsedThisMonth: 1 }, $set: { lastTaskUsageReset: Date.now() } });
      return { success: true };
    } catch (error) {
      console.error("Error incrementing user task count:", error);
      // Do not throw error here to ensure main flow continues, but log it.
      // In a real system, you might want to handle this more robustly.
      return { success: false, error: error.message };
    }
  }
}

module.exports = new HybridDataService();
