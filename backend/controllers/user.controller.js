const User = require("../models/users.model");
const { clerkClient } = require("@clerk/express");

const viewUsers = async (req, res) => {
  try {
    const users = await User.find({});
    const amount = await User.countDocuments({});
    res.status(200).json(users);
    console.log({ totalItems: amount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUserSchool = async (req, res) => {
  try {
    const { userId, school } = req.body;

    if (!userId || !school) {
      return res
        .status(400)
        .json({ message: "userId and school are required" });
    }

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      { $set: { school } },
      { new: true, upsert: true }
    );

    res.status(200).json({
      message: "School updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserByClerkId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const syncUser = async (req, res) => {
  try {
    const { userId, school } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    console.log("=== SYNC USER DEBUG ===");
    console.log("userId:", userId);
    console.log("school:", school);

    // Use Clerk's backend SDK to get the user data directly from Clerk
    const clerkUser = await clerkClient.users.getUser(userId);

    console.log("Clerk user data:", JSON.stringify(clerkUser, null, 2));

    // Extract fullName from first_name and last_name
    const fullName = [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    // Extract phone numbers from the phoneNumbers array
    const phoneNumbers =
      clerkUser.phoneNumbers?.map((phone) => phone.phoneNumber) || [];

    // Extract profile image URL
    const profileImg = clerkUser.profileImageUrl || clerkUser.imageUrl || "";

    // Extract primary email
    const email = clerkUser.primaryEmailAddress?.emailAddress || "";

    // Prepare update data
    const updateData = {
      userId,
      ...(email && { email }),
      ...(fullName && { fullName }),
      ...(profileImg && { profileImg }),
      ...(phoneNumbers.length > 0 && { phoneNumbers }),
      ...(school && { school }), // Include school if provided
    };

    // Debug: Log the final update data
    console.log("Final updateData:", JSON.stringify(updateData, null, 2));
    console.log("=== END DEBUG ===");

    const syncedUser = await User.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, upsert: true }
    );

    res.status(200).json({
      message: "User synced successfully",
      user: syncedUser,
    });
  } catch (error) {
    console.error("Error syncing user:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  viewUsers,
  updateUserSchool,
  getUserByClerkId,
  syncUser,
};
