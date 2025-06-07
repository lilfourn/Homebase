const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");
const compression = require("compression");
const Course = require("./models/course.model");
const User = require("./models/users.model");
const Syllabus = require("./models/syllabus.model");
const courseRoute = require("./routes/course.route");
const userRoute = require("./routes/syncUsers.route");
const googleDriveRoute = require("./routes/googleDrive.route");
const { clerkClient, clerkMiddleware } = require("@clerk/express");
const { verifyWebhook } = require("@clerk/express");
const syllabusRoutes = require("./routes/syllabus.routes");
const todoRoutes = require("./routes/todo.route");
const agentRoutes = require("./routes/agent.routes");
const fileProcessingRoutes = require("./routes/fileProcessing.routes");
const terminalRoutes = require("./routes/terminal.routes");
// const agentTaskQueue = require("./services/queues/agentTaskQueue"); // Removed - no queuing
// const agentTaskWorker = require("./services/workers/agentTaskWorker"); // Removed - no queuing
const app = express();

// Request timeout middleware
const requestTimeout =
  (timeout = 30000) =>
  (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: "Request timeout",
          message: "The request took too long to process",
        });
      }
    }, timeout);

    res.on("finish", () => clearTimeout(timer));
    res.on("close", () => clearTimeout(timer));
    next();
  };

// Middleware config
app.use(compression()); // Enable gzip compression
app.use(requestTimeout(30000)); // 30 second global timeout
app.use(express.json({ limit: "10mb" })); // Allows us to send information in json
app.use(express.urlencoded({ extended: false, limit: "10mb" })); // Allows to send form data
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "https://f498-2600-4040-9e88-2f00-70e4-5900-49b9-2276.ngrok-free.app",
      ];
      
      // Allow any localhost port in development
      if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // <-- this tells Express to send Access-Control-Allow-Credentials: true
  })
);

// Add Clerk middleware here
app.use(clerkMiddleware());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (duration > 5000) {
      console.warn(
        `Slow request: ${req.method} ${req.path} took ${duration}ms`
      );
    }
  });
  next();
});

// routes
app.use("/api/courses", courseRoute);
app.use("/api/users", userRoute);
app.use("/api/google-drive", googleDriveRoute);
app.use("/api/syllabus", syllabusRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/file-processing", fileProcessingRoutes);
app.use("/api/terminal", terminalRoutes);

app.get("/", async (req, res) => {
  res.send("Good Job");
});

// Database health check endpoint
app.get("/health", async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    if (dbState === 1) {
      // Test both collections
      const courseCount = await Course.countDocuments();
      const userCount = await User.countDocuments();

      res.status(200).json({
        status: "healthy",
        database: states[dbState],
        collections: {
          courses: courseCount,
          users: userCount,
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: "unhealthy",
        database: states[dbState],
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Clerk webhook endpoint for user sync
app.post(
  "/api/webhooks/clerk",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const evt = await verifyWebhook(req);

      const { id } = evt.data;
      const eventType = evt.type;

      console.log(
        `Received webhook with ID ${id} and event type of ${eventType}`
      );

      if (eventType === "user.created" || eventType === "user.updated") {
        const user = evt.data;
        const {
          id: userId,
          first_name,
          last_name,
          image_url,
          email_addresses,
        } = user;

        const fullName = [first_name, last_name].filter(Boolean).join(" ");
        const email = email_addresses?.[0]?.email_address;

        await User.findOneAndUpdate(
          { userId },
          {
            $set: {
              fullName,
              email,
              profileImg: image_url,
            },
          },
          { upsert: true, new: true }
        );

        console.log(`User ${userId} synced to database`);
      }

      return res.send("Webhook received");
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return res.status(400).send("Error verifying webhook");
    }
  }
);

// sync users to db
app.post("/sync/users", async (req, res) => {
  try {
    // 1) fetch full user list from Clerk
    const { data: users } = await clerkClient.users.getUserList();

    // 2) build a bulkWrite ops array
    const ops = users.map(
      ({ id, firstName, lastName, imageUrl, emailAddresses }) => {
        const fullName = [firstName, lastName].filter(Boolean).join(" ");
        const email = emailAddresses?.[0]?.emailAddress;
        return {
          updateOne: {
            filter: { userId: id },
            update: {
              $set: {
                fullName,
                email,
                profileImg: imageUrl,
              },
            },
            upsert: true,
          },
        };
      }
    );

    // 3) execute bulk upsert
    const result = await User.bulkWrite(ops);

    // 4) return summary of what happened
    res.json({ syncedCount: result.upsertedCount + result.modifiedCount });
    console.log("Synced Users to DB Successfully!");
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ message: error.message });
  }
});

// MongoDB connection with optimized settings
const mongooseOptions = {
  maxPoolSize: 10, // Increase connection pool
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4, skip trying IPv6
};

mongoose
  .connect(process.env.MONGO_DB, mongooseOptions)
  .then(async () => {
    console.log("Connected to database with optimized settings!");

    // Ensure indexes are created
    try {
      await mongoose.connection.db
        .collection("courses")
        .createIndex(
          { userId: 1, code: 1 },
          { unique: true, background: true }
        );
      await mongoose.connection.db
        .collection("users")
        .createIndex({ userId: 1 }, { unique: true, background: true });
      await mongoose.connection.db
        .collection("syllabi")
        .createIndex(
          { userId: 1, courseInstanceId: 1 },
          { unique: true, background: true }
        );
      await mongoose.connection.db
        .collection("todos")
        .createIndex({ userId: 1, courseInstanceId: 1 }, { background: true });
      await mongoose.connection.db
        .collection("todos")
        .createIndex({ todoId: 1 }, { unique: true, background: true });
      console.log("Database indexes created successfully");
    } catch (indexError) {
      console.log(
        "Index creation warning (may already exist):",
        indexError.message
      );
    }

    app.listen(8000, () => {
      console.log("Server is running on port 8000 successfully");

      // Queue system removed - no task processing
      // console.log("[Agent] Starting agent task processor...");
      // agentTaskQueue.queue.process("process-agent-task", 2, async (job) => {
      //   return await agentTaskWorker.processTask(job);
      // });

      // // Queue event handlers
      // agentTaskQueue.queue.on("error", (error) => {
      //   console.error("[Agent] Queue error:", error);
      // });

      // agentTaskQueue.queue.on("active", (job) => {
      //   console.log(`[Agent] Job ${job.id} has started processing`);
      // });

      // agentTaskQueue.queue.on("completed", (job, result) => {
      //   console.log(`[Agent] Job ${job.id} completed successfully`);
      // });

      // agentTaskQueue.queue.on("failed", (job, err) => {
      //   console.error(`[Agent] Job ${job.id} failed:`, err.message);
      // });

      // console.log("[Agent] Agent task processor started successfully");
    });
  })
  .catch((error) => {
    console.log("Connection failed:", error.message);
    process.exit(1);
  });

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing server...");
  // await agentTaskWorker.shutdown(); // Removed - no queuing
  // await agentTaskQueue.close(); // Removed - no queuing
  await mongoose.connection.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing server...");
  // await agentTaskWorker.shutdown(); // Removed - no queuing
  // await agentTaskQueue.close(); // Removed - no queuing
  await mongoose.connection.close();
  process.exit(0);
});
