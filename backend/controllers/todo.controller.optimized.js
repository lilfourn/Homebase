const Todo = require("../models/todo.model");
const Course = require("../models/course.model");
const { getAuth } = require("@clerk/express");

// Simple in-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds

function getCacheKey(userId, courseInstanceId) {
  return `${userId}-${courseInstanceId}`;
}

function setCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

function getCache(key) {
  const cached = cache.get(key);
  if (cached && cached.timestamp > Date.now() - CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

// Clear cache for a specific user/course
function clearCache(userId, courseInstanceId) {
  const key = getCacheKey(userId, courseInstanceId);
  cache.delete(key);
}

// Get all todos for a course
exports.getTodosByCourse = async (req, res) => {
  try {
    const { courseInstanceId } = req.params;
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ 
        success: false,
        error: "Unauthorized",
        message: "Authentication required"
      });
    }

    if (!courseInstanceId) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid request",
        message: "Course ID is required" 
      });
    }

    // Check cache first
    const cacheKey = getCacheKey(auth.userId, courseInstanceId);
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      return res.status(200).json({ 
        success: true, 
        data: cachedData,
        count: cachedData.length,
        cached: true
      });
    }

    // Verify course ownership - optimized query
    const course = await Course.findOne({ 
      courseInstanceId, 
      userId: auth.userId 
    })
    .select('_id')
    .lean()
    .maxTimeMS(5000); // 5 second timeout

    if (!course) {
      return res.status(404).json({ 
        success: false,
        error: "Course not found",
        message: "Course not found or access denied"
      });
    }

    // Clean up old completed tasks (non-blocking)
    Todo.cleanupOldCompleted().catch(err => 
      console.error("Error cleaning up old todos:", err)
    );

    // Get todos with optimized query
    const todos = await Todo.find({
      userId: auth.userId,
      courseInstanceId,
    })
    .sort({ 
      completed: 1, // Incomplete first
      dueDate: 1, // Earlier dates first
      createdAt: -1 
    })
    .select('-__v') // Exclude version field
    .lean() // Use lean() for better performance
    .maxTimeMS(10000); // 10 second timeout

    // Cache the result
    setCache(cacheKey, todos || []);

    // Always return consistent format
    res.status(200).json({ 
      success: true, 
      data: todos || [],
      count: todos ? todos.length : 0
    });
  } catch (error) {
    console.error("Error fetching todos:", error);
    
    // Handle timeout errors
    if (error.name === 'MongooseError' && error.message.includes('maxTimeMS')) {
      return res.status(504).json({
        success: false,
        error: "Query timeout",
        message: "Database query took too long. Please try again."
      });
    }
    
    // Check for specific MongoDB errors
    if (error.name === 'MongoNetworkError' || error.name === 'MongooseServerSelectionError') {
      return res.status(503).json({
        success: false,
        error: "Database unavailable",
        message: "Unable to connect to database",
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message || "Error fetching todos",
    });
  }
};

// Create a new todo
exports.createTodo = async (req, res) => {
  try {
    const { courseInstanceId, title, description, dueDate, category, tags } = req.body;
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ 
        success: false,
        error: "Unauthorized",
        message: "Authentication required"
      });
    }

    if (!courseInstanceId || !title) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid request",
        message: "Course ID and title are required" 
      });
    }

    // Verify course ownership - optimized
    const course = await Course.findOne({ 
      courseInstanceId, 
      userId: auth.userId 
    })
    .select('_id')
    .lean()
    .maxTimeMS(5000);

    if (!course) {
      return res.status(404).json({ 
        success: false,
        error: "Course not found",
        message: "Course not found or access denied" 
      });
    }

    // Create new todo
    const newTodo = new Todo({
      userId: auth.userId,
      courseInstanceId,
      title,
      description: description || "",
      dueDate: dueDate ? new Date(dueDate) : null,
      category: category || "task",
      tags: tags || [],
    });

    await newTodo.save();

    // Clear cache
    clearCache(auth.userId, courseInstanceId);

    res.status(201).json({
      success: true,
      data: newTodo.toObject(),
      message: "Todo created successfully",
    });
  } catch (error) {
    console.error("Error creating todo:", error);
    res.status(500).json({
      success: false,
      error: "Error creating todo",
      message: error.message,
    });
  }
};

// Update a todo
exports.updateTodo = async (req, res) => {
  try {
    const { todoId } = req.params;
    const { title, description, dueDate, category, tags, completed } = req.body;
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ 
        success: false,
        error: "Unauthorized",
        message: "Authentication required"
      });
    }

    // Find and update in one operation
    const todo = await Todo.findOneAndUpdate(
      { todoId, userId: auth.userId },
      {
        $set: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
          ...(category !== undefined && { category }),
          ...(tags !== undefined && { tags }),
          ...(completed !== undefined && { completed })
        }
      },
      { new: true, runValidators: true, maxTimeMS: 5000 }
    );

    if (!todo) {
      return res.status(404).json({ 
        success: false,
        error: "Not found",
        message: "Todo not found or access denied" 
      });
    }

    // Clear cache
    clearCache(auth.userId, todo.courseInstanceId);

    res.status(200).json({
      success: true,
      data: todo.toObject(),
      message: "Todo updated successfully",
    });
  } catch (error) {
    console.error("Error updating todo:", error);
    res.status(500).json({
      success: false,
      error: "Error updating todo",
      message: error.message,
    });
  }
};

// Toggle todo completion
exports.toggleTodoCompletion = async (req, res) => {
  try {
    const { todoId } = req.params;
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ 
        success: false,
        error: "Unauthorized",
        message: "Authentication required"
      });
    }

    // Find todo first to get current state
    const todo = await Todo.findOne({ 
      todoId, 
      userId: auth.userId 
    })
    .select('completed courseInstanceId')
    .maxTimeMS(5000);

    if (!todo) {
      return res.status(404).json({ 
        success: false,
        error: "Not found",
        message: "Todo not found or access denied" 
      });
    }

    // Toggle completion
    todo.completed = !todo.completed;
    await todo.save();

    // Clear cache
    clearCache(auth.userId, todo.courseInstanceId);

    res.status(200).json({
      success: true,
      data: todo.toObject(),
      message: `Todo marked as ${todo.completed ? 'completed' : 'incomplete'}`,
    });
  } catch (error) {
    console.error("Error toggling todo:", error);
    res.status(500).json({
      success: false,
      error: "Error toggling todo completion",
      message: error.message,
    });
  }
};

// Delete a todo
exports.deleteTodo = async (req, res) => {
  try {
    const { todoId } = req.params;
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ 
        success: false,
        error: "Unauthorized",
        message: "Authentication required"
      });
    }

    // Find and delete in one operation
    const todo = await Todo.findOneAndDelete({ 
      todoId, 
      userId: auth.userId 
    })
    .select('courseInstanceId')
    .maxTimeMS(5000);

    if (!todo) {
      return res.status(404).json({ 
        success: false,
        error: "Not found",
        message: "Todo not found or access denied" 
      });
    }

    // Clear cache
    clearCache(auth.userId, todo.courseInstanceId);

    res.status(200).json({
      success: true,
      message: "Todo deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting todo:", error);
    res.status(500).json({
      success: false,
      error: "Error deleting todo",
      message: error.message,
    });
  }
};

// Bulk update todos (for batch operations)
exports.bulkUpdateTodos = async (req, res) => {
  try {
    const { todoIds, updates } = req.body;
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ 
        success: false,
        error: "Unauthorized",
        message: "Authentication required"
      });
    }

    if (!Array.isArray(todoIds) || todoIds.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid request",
        message: "Todo IDs array is required" 
      });
    }

    // Get unique course IDs for cache clearing
    const todos = await Todo.find({ 
      todoId: { $in: todoIds }, 
      userId: auth.userId 
    })
    .select('courseInstanceId')
    .lean()
    .maxTimeMS(5000);

    if (todos.length !== todoIds.length) {
      return res.status(403).json({ 
        success: false,
        error: "Access denied",
        message: "Some todos not found or access denied" 
      });
    }

    // Apply updates
    const updateResult = await Todo.updateMany(
      { todoId: { $in: todoIds }, userId: auth.userId },
      { $set: updates },
      { maxTimeMS: 10000 }
    );

    // Clear cache for all affected courses
    const courseIds = [...new Set(todos.map(t => t.courseInstanceId))];
    courseIds.forEach(courseId => clearCache(auth.userId, courseId));

    res.status(200).json({
      success: true,
      message: `${updateResult.modifiedCount} todos updated`,
      modifiedCount: updateResult.modifiedCount,
    });
  } catch (error) {
    console.error("Error bulk updating todos:", error);
    res.status(500).json({
      success: false,
      error: "Error bulk updating todos",
      message: error.message,
    });
  }
};