const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");
const Course = require("./models/course.model");
const User = require("./models/users.model")
const courseRoute = require("./routes/course.route");
const { clerkClient } = require("@clerk/express");
const app = express();

// Middleware config
app.use(express.json()); // Allows us to send information in json
app.use(express.urlencoded({ extended: false })); // Allows to send form data
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true    // <-- this tells Express to send Access-Control-Allow-Credentials: true
}));




// routes
app.use("/api/courses", courseRoute);

app.get("/", async (req, res) => {
  res.send("Good Job")
});

// sync users to db
app.post("/sync/users", async (req, res) => {
    try {
      // 1) fetch full user list from Clerk
      const { data: users } = await clerkClient.users.getUserList();
  
      // 2) build a bulkWrite ops array
      const ops = users.map(({ id, firstName, lastName, imageUrl, emailAddresses }) => {
        const fullName = [firstName, lastName].filter(Boolean).join(" ");
        const email    = emailAddresses?.[0]?.emailAddress;
        return {
          updateOne: {
            filter: { userId: id },
            update: {
              $set: {
                fullName,
                email,
                profileImg: imageUrl
              }
            },
            upsert: true
          }
        };
      });

      // 3) execute bulk upsert
      const result = await User.bulkWrite(ops);
  
      // 4) return summary of what happened
      res.json({ syncedCount: result.upsertedCount + result.modifiedCount });
      console.log("Synced Users to DB Successfully!")
    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  

mongoose
  .connect(process.env.MONGO_DB)
  .then(() => {
    console.log("Connected to database!");
    app.listen(8000, () => {
      console.log("Server is running on port 8000 successfully");
    });
  })
  .catch(() => {
    console.log("Connection failed");
  });
