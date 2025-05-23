const User = require("../models/users.model");

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

module.exports = {
  viewUsers,
  updateUserSchool,
  getUserByClerkId,
};
