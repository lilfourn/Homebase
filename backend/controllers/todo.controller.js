const Todo = require("../models/todo.model");
const Course = require("../models/course.model");
const { getAuth } = require("@clerk/express");

// Get all todos for a course
exports.getTodosByCourse = async (req, res) => {
  try {
    const { courseInstanceId } = req.params;
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify course ownership
    const course = await Course.findOne({ 
      courseInstanceId, 
      userId: auth.userId 
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found or access denied" });
    }

    // Get todos with sorting
    const todos = await Todo.find({
      userId: auth.userId,
      courseInstanceId,
    }).sort({ 
      completed: 1, // Incomplete first
      dueDate: 1, // Earlier dates first
      priority: -1, // High priority first
      createdAt: -1 
    });

    res.status(200).json({ 
      success: true, 
      data: todos 
    });
  } catch (error) {
    console.error("Error fetching todos:", error);
    res.status(500).json({
      success: false,
      error: "Error fetching todos",
      message: error.message,
    });
  }
};

// Create a new todo
exports.createTodo = async (req, res) => {
  try {
    const { courseInstanceId, title, description, dueDate, priority, tags } = req.body;
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
      priority: priority || "medium",
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
    const { title, description, dueDate, priority, tags, completed } = req.body;
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
    if (priority !== undefined) todo.priority = priority;
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