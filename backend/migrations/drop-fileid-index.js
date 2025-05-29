const mongoose = require("mongoose");
require("dotenv").config();

async function dropFileIdIndex() {
  try {
    await mongoose.connect(process.env.MONGO_DB);
    console.log("Connected to database!");

    // Drop the fileId index if it exists
    try {
      await mongoose.connection.db.collection("syllabi").dropIndex("fileId_1");
      console.log("Successfully dropped fileId unique index");
    } catch (error) {
      if (error.code === 27) {
        console.log("fileId index doesn't exist, nothing to drop");
      } else {
        console.error("Error dropping index:", error);
      }
    }

    console.log("Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

dropFileIdIndex();