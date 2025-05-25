const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

// Get your API key from environment variables
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("GEMINI_API_KEY environment variable not set.");
  // Potentially throw an error or use a less critical default behavior
  // For now, we'll allow the module to load but functions will fail.
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

/**
 * Checks if an image is appropriate for a school logo using Gemini API.
 *
 * @param {Buffer} imageBuffer The image data as a Buffer.
 * @param {string} mimeType The MIME type of the image (e.g., "image/png", "image/jpeg").
 * @returns {Promise<boolean>} True if the image is deemed appropriate, false otherwise.
 */
async function isImageAppropriate(imageBuffer, mimeType) {
  if (!genAI) {
    console.error(
      "GoogleGenerativeAI client not initialized. Check GEMINI_API_KEY."
    );
    return false; // Cannot perform check
  }

  if (!imageBuffer || !mimeType) {
    console.error("Image buffer and MIME type are required.");
    return false;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-pro-vision", // or "gemini-ultra-vision" if available and preferred
      safetySettings,
    });

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType: mimeType,
      },
    };

    const prompt =
      "Is this image appropriate and safe to be used as a school logo? Analyze it for any signs of harassment, hate speech, sexually explicit content, or dangerous content. Respond with a simple 'yes' or 'no' based on whether it passes all safety checks for a general audience school environment.";

    // console.log("Sending request to Gemini Vision API..."); // For debugging

    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;

    // console.log("Gemini API Response:", JSON.stringify(response, null, 2)); // For debugging

    // Check if the response was blocked due to safety settings
    if (response.promptFeedback && response.promptFeedback.blockReason) {
      console.warn(
        `Image flagged by safety settings: ${response.promptFeedback.blockReason}`,
        response.promptFeedback.safetyRatings
      );
      return false; // Blocked by safety filters
    }

    // Additional check: Analyze the text content if available.
    // Sometimes an image might pass the direct safety filters but generate text
    // that indicates an issue, or the model's textual interpretation can be a hint.
    const textResponse = response.text
      ? response.text().toLowerCase().trim()
      : "";

    if (textResponse.includes("no")) {
      console.warn(
        "Image deemed inappropriate based on Gemini's textual response:",
        textResponse
      );
      return false;
    }
    if (textResponse.includes("yes")) {
      console.log("Image deemed appropriate by Gemini.");
      return true;
    }

    // If not explicitly blocked and no clear "no" in text, consider it appropriate.
    // You might want to add more sophisticated logic here based on `safetyRatings`
    // even if not directly blocked. For example, if any rating is HIGH, even if not blocked.
    // For now, we rely on the blockReason and a simple text check.

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.finishReason === "SAFETY") {
        console.warn(
          `Image content flagged by safety policy (finishReason: SAFETY). Ratings:`,
          candidate.safetyRatings
        );
        return false;
      }
      // Check individual safety ratings if needed
      // candidate.safetyRatings will contain an array like:
      // [{ category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', probability: 'NEGLIGIBLE' }, ...]
      // You can iterate through these and decide if any probability level (e.g., 'HIGH') is unacceptable.
    }

    console.log("Image passed Gemini safety checks and textual analysis.");
    return true;
  } catch (error) {
    console.error("Error calling Gemini API for image moderation:", error);
    // Depending on the error, you might want to default to true or false.
    // For safety, defaulting to false if the check fails is a good practice.
    return false;
  }
}

module.exports = {
  isImageAppropriate,
};
