const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");
const Course = require("./models/course.model");
const User = require("./models/users.model");
const Syllabus = require("./models/syllabus.model");
const courseRoute = require("./routes/course.route");
const userRoute = require("./routes/syncUsers.route");
const googleDriveRoute = require("./routes/googleDrive.route");
const { clerkClient, clerkMiddleware } = require("@clerk/express");
const { verifyWebhook } = require("@clerk/express");
const syllabusRoutes = require("./routes/syllabus.routes");
const app = express();

// Middleware config
app.use(express.json()); // Allows us to send information in json
app.use(express.urlencoded({ extended: false })); // Allows to send form data
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://f498-2600-4040-9e88-2f00-70e4-5900-49b9-2276.ngrok-free.app",
    ],
    credentials: true, // <-- this tells Express to send Access-Control-Allow-Credentials: true
  })
);

// Add Clerk middleware here
app.use(clerkMiddleware());

// routes
app.use("/api/courses", courseRoute);
app.use("/api/users", userRoute);
app.use("/api/google-drive", googleDriveRoute);
app.use("/api/syllabus", syllabusRoutes);

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

mongoose
  .connect(process.env.MONGO_DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("Connected to database!");

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
      console.log("Database indexes created successfully");
    } catch (indexError) {
      console.log(
        "Index creation warning (may already exist):",
        indexError.message
      );
    }

    app.listen(8000, () => {
      console.log("Server is running on port 8000 successfully");
    });
  })
  .catch((error) => {
    console.log("Connection failed:", error.message);
    process.exit(1);
  });
