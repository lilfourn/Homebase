const { clerkClient, getAuth } = require("@clerk/express");
const User = require("../models/users.model");

const syncUserMiddleware = async (req, res, next) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) return next();

    // Check if user exists and when last synced
    const existingUser = await User.findOne({ userId });
    const shouldSync =
      !existingUser ||
      (existingUser.lastSynced &&
        Date.now() - existingUser.lastSynced > 24 * 60 * 60 * 1000); // 24 hours

    if (shouldSync) {
      // Fetch fresh user data from Clerk
      const clerkUser = await clerkClient.users.getUser(userId);

      const fullName = [clerkUser.firstName, clerkUser.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

      const phoneNumbers =
        clerkUser.phoneNumbers?.map((p) => p.phoneNumber) || [];
      const profileImg = clerkUser.profileImageUrl || clerkUser.imageUrl || "";
      const email = clerkUser.emailAddresses?.[0]?.emailAddress || "";

      await User.findOneAndUpdate(
        { userId },
        {
          $set: {
            userId,
            ...(email && { email }),
            ...(fullName && { fullName }),
            ...(profileImg && { profileImg }),
            ...(phoneNumbers.length > 0 && { phoneNumbers }),
            lastSynced: new Date(),
          },
        },
        { upsert: true, new: true }
      );
    }

    next();
  } catch (error) {
    console.error("Sync middleware error:", error);
    next(); // Continue even if sync fails
  }
};

module.exports = { syncUserMiddleware };
