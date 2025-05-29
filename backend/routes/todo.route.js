const express = require("express");
const { requireAuth } = require("@clerk/express");
const router = express.Router();
const todoController = require("../controllers/todo.controller");

// Get all todos for a course
router.get(
  "/:courseInstanceId",
  requireAuth(),
  todoController.getTodosByCourse
);

// Create a new todo
router.post(
  "/",
  requireAuth(),
  todoController.createTodo
);

// Update a todo
router.put(
  "/:todoId",
  requireAuth(),
  todoController.updateTodo
);

// Toggle todo completion
router.patch(
  "/:todoId/toggle",
  requireAuth(),
  todoController.toggleTodoCompletion
);

// Delete a todo
router.delete(
  "/:todoId",
  requireAuth(),
  todoController.deleteTodo
);

// Bulk update todos
router.patch(
  "/bulk/update",
  requireAuth(),
  todoController.bulkUpdateTodos
);

module.exports = router;