import "dotenv/config";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SchoolColorsSchema = z.object({
  primary_color: z
    .string()
    .describe(
      "The primary brand color of the school in hex format (e.g., #FF5733)"
    ),
  secondary_color: z
    .string()
    .describe(
      "The secondary brand color of the school in hex format (e.g., #33A1FF)"
    ),
  school_name: z.string().describe("The official name of the school"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence level of the color accuracy (0-1)"),
  source: z
    .string()
    .describe(
      "Brief description of where these colors are commonly used (e.g., 'official logo and athletic uniforms')"
    ),
});

export async function getSchoolColors(schoolName) {
  try {
    if (!schoolName) {
      throw new Error("School name is required");
    }

    const completion = await client.beta.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "system",
          content: `You are an expert on university and college branding. Your task is to identify the official primary and secondary brand colors for educational institutions. Always provide colors in hex format. If you're unsure about specific colors, provide your best estimate based on commonly known school colors and indicate lower confidence.`,
        },
        {
          role: "user",
          content: `What are the official primary and secondary brand colors for ${schoolName}? Please provide the hex color codes.`,
        },
      ],
      response_format: zodResponseFormat(SchoolColorsSchema, "school_colors"),
    });

    const message = completion.choices[0]?.message;
    if (message?.parsed) {
      return {
        success: true,
        data: message.parsed,
      };
    } else {
      throw new Error("Failed to parse school colors response");
    }
  } catch (error) {
    console.error("Error fetching school colors:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch school colors",
      data: null,
    };
  }
}

export default getSchoolColors;
