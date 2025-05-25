import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getSchoolColors(schoolName) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using the fastest model as requested
      messages: [
        {
          role: "system",
          content:
            'You are a helpful assistant that returns a JSON object with primary and secondary hex color codes for a given school. For example, if the school is "University of California, Berkeley", you should return {"primaryColor": "#003262", "secondaryColor": "#FDB515"}. Only return the JSON object.',
        },
        {
          role: "user",
          content: `Get the primary and secondary colors for ${schoolName}.`,
        },
      ],
      temperature: 0.2, // Lower temperature for more deterministic and factual output
    });

    const content = completion.choices[0].message.content;

    // Attempt to parse the JSON string.
    try {
      const colors = JSON.parse(content);
      // Validate that the expected color properties exist
      if (colors && colors.primaryColor && colors.secondaryColor) {
        return colors;
      } else {
        console.error(
          "OpenAI response did not contain expected color properties:",
          content
        );
        // Fallback or default colors if parsing/validation fails
        return { primaryColor: "#000000", secondaryColor: "#FFFFFF" };
      }
    } catch (parseError) {
      console.error(
        "Error parsing JSON from OpenAI response:",
        parseError,
        "Original content:",
        content
      );
      // Fallback or default colors if JSON parsing fails
      return { primaryColor: "#000000", secondaryColor: "#FFFFFF" };
    }
  } catch (error) {
    console.error("Error fetching school colors from OpenAI:", error);
    // Fallback or default colors in case of API error
    return { primaryColor: "#000000", secondaryColor: "#FFFFFF" };
  }
}

export default getSchoolColors;
