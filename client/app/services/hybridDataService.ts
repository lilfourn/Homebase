/**
 * Hybrid Data Service
 * 
 * This service manages the integration between MongoDB (for file storage)
 * and Convex (for real-time agent data). It ensures data consistency
 * and provides a unified interface for data operations.
 */

import { Id } from "../../convex/_generated/dataModel";

export interface MongoFileReference {
  fileId: string;
  userId: string;
  courseInstanceId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}

export interface ConvexFileReference {
  fileId: string; // MongoDB _id
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Converts MongoDB file documents to Convex-compatible references
 */
export function mongoToConvexFileRef(mongoFile: MongoFileReference): ConvexFileReference {
  return {
    fileId: mongoFile.fileId,
    fileName: mongoFile.fileName,
    fileSize: mongoFile.fileSize,
    mimeType: mongoFile.mimeType
  };
}

/**
 * Validates that MongoDB files exist before creating Convex task
 */
export async function validateFileReferences(
  fileIds: string[],
  apiUrl: string,
  userToken: string
): Promise<{ valid: boolean; files?: MongoFileReference[]; error?: string }> {
  try {
    const response = await fetch(`${apiUrl}/api/files/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ fileIds })
    });

    if (!response.ok) {
      return { valid: false, error: 'Failed to validate files' };
    }

    const data = await response.json();
    return { valid: true, files: data.files };
  } catch (error) {
    console.error('[validateFileReferences] Error:', error);
    return { valid: false, error: 'Network error validating files' };
  }
}

/**
 * Creates a mapping between Convex task IDs and MongoDB file IDs
 */
export interface TaskFileMapping {
  convexTaskId: Id<"agentTasks">;
  mongoFileIds: string[];
  createdAt: number;
}

/**
 * Manages task-file mappings in local storage for quick reference
 * In production, this could be stored in Redis or a dedicated service
 */
export class TaskFileMappingService {
  private static STORAGE_KEY = 'homebase_task_file_mappings';

  static saveMapping(mapping: TaskFileMapping): void {
    const mappings = this.getAllMappings();
    mappings.push(mapping);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mappings));
  }

  static getMappingByTaskId(taskId: Id<"agentTasks">): TaskFileMapping | null {
    const mappings = this.getAllMappings();
    return mappings.find(m => m.convexTaskId === taskId) || null;
  }

  static getAllMappings(): TaskFileMapping[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  static clearOldMappings(daysOld: number = 30): void {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const mappings = this.getAllMappings().filter(m => m.createdAt > cutoffTime);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mappings));
  }
}

/**
 * Fetches file content from MongoDB for agent processing
 */
export async function fetchFileContent(
  fileId: string,
  apiUrl: string,
  userToken: string
): Promise<{ content?: string; error?: string }> {
  try {
    const response = await fetch(`${apiUrl}/api/files/${fileId}/content`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    if (!response.ok) {
      return { error: 'Failed to fetch file content' };
    }

    const data = await response.json();
    return { content: data.content };
  } catch (error) {
    console.error('[fetchFileContent] Error:', error);
    return { error: 'Network error fetching file' };
  }
}

/**
 * Hybrid data operation: Create agent task with MongoDB file validation
 */
export interface CreateAgentTaskParams {
  userId: string;
  courseInstanceId: string;
  taskName: string;
  agentType: "note-taker" | "researcher" | "study-buddy" | "assignment";
  config: {
    mode: string;
    model: string;
    customSettings: any;
  };
  mongoFileIds: string[];
  apiUrl: string;
  userToken: string;
}

export async function createAgentTaskWithValidation(
  params: CreateAgentTaskParams,
  createConvexTask: Function
): Promise<{ success: boolean; taskId?: Id<"agentTasks">; error?: string }> {
  // Step 1: Validate MongoDB files exist
  const validation = await validateFileReferences(
    params.mongoFileIds,
    params.apiUrl,
    params.userToken
  );

  if (!validation.valid || !validation.files) {
    return { success: false, error: validation.error || 'Invalid files' };
  }

  // Step 2: Convert to Convex format
  const convexFiles = validation.files.map(mongoToConvexFileRef);

  // Step 3: Create Convex task
  try {
    const result = await createConvexTask({
      userId: params.userId,
      courseInstanceId: params.courseInstanceId,
      taskName: params.taskName,
      agentType: params.agentType,
      config: params.config,
      files: convexFiles
    });

    // Step 4: Save mapping for reference
    if (result.taskId) {
      TaskFileMappingService.saveMapping({
        convexTaskId: result.taskId,
        mongoFileIds: params.mongoFileIds,
        createdAt: Date.now()
      });
    }

    return { success: true, taskId: result.taskId };
  } catch (error) {
    console.error('[createAgentTaskWithValidation] Error:', error);
    return { success: false, error: 'Failed to create task' };
  }
}