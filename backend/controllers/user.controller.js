const User = require("../models/users.model");
const { clerkClient } = require("@clerk/express");
const getSchoolColorsService =
  require("../services/users/getSchoolColors").default;
const multer = require("multer");
const ImageKit = require("imagekit"); // Import ImageKit SDK

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

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

    let user = await User.findOne({ userId });

    if (!user) {
      console.log(`[User ${userId}]: Not found in DB.`);
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has a school but no school colors
    if (
      user.school &&
      (!user.schoolColors?.primary || !user.schoolColors?.secondary)
    ) {
      console.log(
        `[User ${userId}]: School '${user.school}' present, but colors are missing. Attempting to fetch...`
      );
      try {
        const colors = await getSchoolColorsService(user.school);
        if (colors && colors.primaryColor && colors.secondaryColor) {
          user.schoolColors = {
            primary: colors.primaryColor,
            secondary: colors.secondaryColor,
          };
          user = await User.findOneAndUpdate(
            { userId },
            { $set: { schoolColors: user.schoolColors } },
            { new: true }
          );
          console.log(
            `[User ${userId}]: Colors for '${user.school}' fetched and SAVED successfully: Primary - ${colors.primaryColor}, Secondary - ${colors.secondaryColor}`
          );
        } else {
          console.warn(
            `[User ${userId}]: Could not fetch or validate colors for school: '${user.school}'. Colors remain NOT STORED.`
          );
        }
      } catch (colorError) {
        console.error(
          `[User ${userId}]: Error fetching colors for '${user.school}':`,
          colorError.message,
          ". Colors remain NOT STORED."
        );
      }
    } else if (
      user.school &&
      user.schoolColors?.primary &&
      user.schoolColors?.secondary
    ) {
      // This console.log will be removed
    } else if (!user.school) {
      console.log(
        `[User ${userId}]: No school set. Colors cannot be determined or stored.`
      );
    } else {
      console.log(
        `[User ${userId}]: School colors status indeterminate. School: '${
          user.school
        }', Colors: ${JSON.stringify(user.schoolColors)}`
      );
    }

    let responseUser = user.toObject ? user.toObject() : { ...user };

    if (
      !responseUser.customPrimaryColor &&
      responseUser.schoolColors?.primary
    ) {
      responseUser.customPrimaryColor = responseUser.schoolColors.primary;
    }
    if (
      !responseUser.customSecondaryColor &&
      responseUser.schoolColors?.secondary
    ) {
      responseUser.customSecondaryColor = responseUser.schoolColors.secondary;
    }

    res.status(200).json(responseUser);
  } catch (error) {
    console.error("[getUserByClerkId Controller Error]:", error);
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

const updateUserSchoolAndColors = async (req, res) => {
  try {
    const { userId, schoolName } = req.body;

    if (!userId || !schoolName) {
      return res
        .status(400)
        .json({ message: "userId and schoolName are required" });
    }

    // Fetch school colors
    const colors = await getSchoolColorsService(schoolName);

    if (!colors || !colors.primaryColor || !colors.secondaryColor) {
      // Log the issue but proceed to update the school name at least
      console.warn(
        `Could not fetch colors for ${schoolName}, or colors were incomplete.`
      );
    }

    // Prepare update data
    // We always update the school name.
    // We only update schoolColors if they were successfully fetched.
    const updateData = {
      school: schoolName,
      ...(colors &&
        colors.primaryColor &&
        colors.secondaryColor && {
          schoolColors: {
            primary: colors.primaryColor,
            secondary: colors.secondaryColor,
          },
          // Reset custom colors to use new school colors as defaults
          customPrimaryColor: colors.primaryColor,
          customSecondaryColor: colors.secondaryColor,
        }),
    };

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, upsert: false } // Don't upsert here, user should exist via sync
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ message: "User not found, cannot update school and colors." });
    }

    res.status(200).json({
      message: "School and colors updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating school and colors:", error);
    res.status(500).json({ message: error.message });
  }
};

const updateUserCustomColors = async (req, res) => {
  try {
    const { userId, primaryColor, secondaryColor } = req.body;
    let newLogoUrl = null; // Will store the ImageKit URL

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const hexColorRegex = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
    if (
      (primaryColor && !hexColorRegex.test(primaryColor)) ||
      (secondaryColor && !hexColorRegex.test(secondaryColor))
    ) {
      return res
        .status(400)
        .json({ message: "Invalid hex color format provided." });
    }

    const updateData = {};
    if (primaryColor !== undefined)
      updateData.customPrimaryColor = primaryColor;
    if (secondaryColor !== undefined)
      updateData.customSecondaryColor = secondaryColor;

    if (req.file) {
      try {
        const uploadResponse = await imagekit.upload({
          file: req.file.buffer, // Pass the file buffer
          fileName: `${userId}-${Date.now()}-${req.file.originalname.replace(
            /\s+/g,
            "-"
          )}`, // Create a unique filename
        });

        newLogoUrl = uploadResponse.url;
        updateData.schoolLogo = newLogoUrl;
      } catch (uploadError) {
        return res.status(500).json({
          message:
            "ImageKit Upload Failed: " +
            (uploadError.message || "Unknown error"),
          errorDetails: uploadError,
        });
      }
    } // end if (req.file)

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ message: "No color or logo data provided to update." });
    }

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      message: "Custom theme updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating custom theme:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  viewUsers,
  updateUserSchool,
  getUserByClerkId,
  syncUser,
  updateUserSchoolAndColors,
  updateUserCustomColors,
  upload, // multer instance
};
