const Todo = require("../models/todo.model");
const Course = require("../models/course.model");
const { getAuth } = require("@clerk/express");

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

    // Verify course ownership with timeout
    const coursePromise = Course.findOne({ 
      courseInstanceId, 
      userId: auth.userId 
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Database timeout")), 10000)
    );
    
    let course;
    try {
      course = await Promise.race([coursePromise, timeoutPromise]);
    } catch (timeoutError) {
      return res.status(504).json({ 
        success: false,
        error: "Database timeout",
        message: "Request took too long, please try again"
      });
    }

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

    // Get todos with sorting and timeout
    const todosPromise = Todo.find({
      userId: auth.userId,
      courseInstanceId,
    }).sort({ 
      completed: 1, // Incomplete first
      dueDate: 1, // Earlier dates first
      createdAt: -1 
    }).lean(); // Use lean() for better performance
    
    const todosTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Query timeout")), 10000)
    );
    
    let todos;
    try {
      todos = await Promise.race([todosPromise, todosTimeoutPromise]);
    } catch (timeoutError) {
      return res.status(504).json({ 
        success: false,
        error: "Query timeout",
        message: "Database query took too long"
      });
    }

    // Always return consistent format
    res.status(200).json({ 
      success: true, 
      data: todos || [],
      count: todos ? todos.length : 0
    });
  } catch (error) {
    console.error("Error fetching todos:", error);
    
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
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!courseInstanceId || !title) {
      return res.status(400).json({ 
        message: "Course ID and title are required" 
      });
    }

    // Verify course ownership
    const course = await Course.findOne({ 
      courseInstanceId, 
      userId: auth.userId 
    });

    if (!course) {
      return res.status(404).json({ 
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

    res.status(201).json({
      success: true,
      data: newTodo,
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
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Find and verify ownership
    const todo = await Todo.findOne({ 
      todoId, 
      userId: auth.userId 
    });

    if (!todo) {
      return res.status(404).json({ 
        message: "Todo not found or access denied" 
      });
    }

    // Update fields
    if (title !== undefined) todo.title = title;
    if (description !== undefined) todo.description = description;
    if (dueDate !== undefined) todo.dueDate = dueDate ? new Date(dueDate) : null;
    if (category !== undefined) todo.category = category;
    if (tags !== undefined) todo.tags = tags;
    if (completed !== undefined) todo.completed = completed;

    await todo.save();

    res.status(200).json({
      success: true,
      data: todo,
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
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Find and verify ownership
    const todo = await Todo.findOne({ 
      todoId, 
      userId: auth.userId 
    });

    if (!todo) {
      return res.status(404).json({ 
        message: "Todo not found or access denied" 
      });
    }

    // Toggle completion
    todo.completed = !todo.completed;
    await todo.save();

    res.status(200).json({
      success: true,
      data: todo,
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
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Find and verify ownership
    const todo = await Todo.findOne({ 
      todoId, 
      userId: auth.userId 
    });

    if (!todo) {
      return res.status(404).json({ 
        message: "Todo not found or access denied" 
      });
    }

    await todo.deleteOne();

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
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!Array.isArray(todoIds) || todoIds.length === 0) {
      return res.status(400).json({ 
        message: "Todo IDs array is required" 
      });
    }

    // Verify ownership of all todos
    const todos = await Todo.find({ 
      todoId: { $in: todoIds }, 
      userId: auth.userId 
    });

    if (todos.length !== todoIds.length) {
      return res.status(403).json({ 
        message: "Some todos not found or access denied" 
      });
    }

    // Apply updates
    const updateResult = await Todo.updateMany(
      { todoId: { $in: todoIds }, userId: auth.userId },
      { $set: updates }
    );

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