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

module.exports = {
  viewUsers,
};
