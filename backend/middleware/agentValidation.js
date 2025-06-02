const validateAgentTask = (req, res, next) => {
  const { courseInstanceId, taskName, agentType, config, files } = req.body;

  // Validate required fields
  if (!courseInstanceId) {
    return res.status(400).json({
      success: false,
      error: "courseInstanceId is required",
    });
  }

  // taskName is now auto-generated in the controller if not provided by client,
  // so this middleware check can be less strict or removed if client never sends it.
  // For now, we allow it to be optional here.
  // if (!taskName || taskName.trim().length === 0) {
  //   return res.status(400).json({
  //     success: false,
  //     error: 'taskName is required'
  //   });
  // }

  // Validate agent type
  const validAgentTypes = [
    "note-taker",
    "researcher",
    "study-buddy",
    "assignment",
  ];
  if (!agentType || !validAgentTypes.includes(agentType)) {
    return res.status(400).json({
      success: false,
      error: `agentType must be one of: ${validAgentTypes.join(", ")}`,
    });
  }

  // Validate config object itself is present (can be empty)
  if (config === undefined || typeof config !== "object" || config === null) {
    // Allow empty object config={}
    return res.status(400).json({
      success: false,
      error: "config must be an object (can be empty)",
    });
  }

  // config.mode and config.model are now optional at this stage.
  // Agents will use their own defaults if these are not provided.
  // if (config.mode && typeof config.mode !== 'string') { // Optional: validate type if present
  //   return res.status(400).json({ success: false, error: 'config.mode must be a string if provided' });
  // }
  // if (config.model && typeof config.model !== 'string') { // Optional: validate type if present
  //   return res.status(400).json({ success: false, error: 'config.model must be a string if provided' });
  // }

  // Validate files
  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({
      success: false,
      error: "At least one file is required",
    });
  }

  // Validate file size limits
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
  const MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 200MB total

  let totalSize = 0;
  for (const file of files) {
    if (!file.fileId || !file.fileName) {
      return res.status(400).json({
        success: false,
        error: "Each file must have fileId and fileName",
      });
    }

    if (file.fileSize > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        error: `File ${file.fileName} exceeds 50MB limit`,
      });
    }

    totalSize += file.fileSize || 0;
  }

  if (totalSize > MAX_TOTAL_SIZE) {
    return res.status(400).json({
      success: false,
      error: "Total file size exceeds 200MB limit",
    });
  }

  // Validate file types
  const allowedMimeTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/markdown",
    "image/png",
    "image/jpeg",
    "image/jpg",
  ];

  for (const file of files) {
    if (!file.mimeType || !allowedMimeTypes.includes(file.mimeType)) {
      return res.status(400).json({
        success: false,
        error: `File type ${file.mimeType} is not supported`,
      });
    }
  }

  next();
};

const validateMessage = (req, res, next) => {
  const { message } = req.body;

  if (!message || typeof message !== "object") {
    return res.status(400).json({
      success: false,
      error: "message object is required",
    });
  }

  if (!message.role || !["user", "assistant"].includes(message.role)) {
    return res.status(400).json({
      success: false,
      error: 'message.role must be "user" or "assistant"',
    });
  }

  if (!message.content || message.content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: "message.content is required",
    });
  }

  next();
};

const validateShareSettings = (req, res, next) => {
  const { shareSettings } = req.body;

  if (!shareSettings || typeof shareSettings !== "object") {
    return res.status(400).json({
      success: false,
      error: "shareSettings object is required",
    });
  }

  if (typeof shareSettings.isPublic !== "boolean") {
    return res.status(400).json({
      success: false,
      error: "shareSettings.isPublic must be a boolean",
    });
  }

  // Validate optional fields if provided
  if (shareSettings.expiresAt !== undefined) {
    if (
      typeof shareSettings.expiresAt !== "number" ||
      shareSettings.expiresAt <= Date.now()
    ) {
      return res.status(400).json({
        success: false,
        error: "shareSettings.expiresAt must be a future timestamp",
      });
    }
  }

  if (shareSettings.sharedWith !== undefined) {
    if (!Array.isArray(shareSettings.sharedWith)) {
      return res.status(400).json({
        success: false,
        error: "shareSettings.sharedWith must be an array of user IDs",
      });
    }
  }

  next();
};

module.exports = {
  validateAgentTask,
  validateMessage,
  validateShareSettings,
};
