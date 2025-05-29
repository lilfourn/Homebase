const OpenAI = require("openai");

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Parse syllabus content and extract structured information
   */
  async parseSyllabusContent(extractedText) {
    try {
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error("No text content provided for parsing");
      }

      const prompt = `
You are an expert at analyzing course syllabi. Please analyze the following syllabus text and extract the requested information. Return your response as a valid JSON object with the exact structure shown below.

IMPORTANT: Return ONLY the JSON object, no additional text or formatting.

Expected JSON structure:
{
  "gradingBreakdown": {
    "assignments": 30,
    "midterm": 20,
    "final": 25,
    "participation": 15,
    "quizzes": 10
  },
  "assignmentDates": [
    {
      "title": "Assignment 1",
      "dueDate": "2024-02-15",
      "description": "Essay on topic X"
    }
  ],
  "examDates": [
    {
      "title": "Midterm Exam",
      "date": "2024-03-15",
      "description": "Covers chapters 1-5"
    }
  ],
  "contacts": [
    {
      "name": "Dr. John Smith",
      "role": "Professor",
      "email": "john.smith@university.edu",
      "phone": "555-123-4567",
      "officeHours": "MWF 2-4 PM, Room 302",
      "assignmentRule": ""
    },
    {
      "name": "Jane Doe",
      "role": "TA",
      "email": "jane.doe@university.edu",
      "phone": "",
      "officeHours": "TTh 1-3 PM, Room 204",
      "assignmentRule": "Last names A-M"
    }
  ],
  "confidence": 0.85
}

Instructions:
1. Extract grading breakdown as percentages (should add up to 100 if possible)
2. Find all assignment due dates and exam dates
3. Format dates as YYYY-MM-DD
4. Extract professor and TA contact information including:
   - Name, role, email, phone
   - Office hours (look for phrases like "office hours", "available", "office", times and room numbers)
   - For TAs: assignment rules (look for how students are assigned to TAs, e.g., "Students with last names A-M", "EIDs starting with 1-5", etc.)
5. Include a confidence score (0-1) based on how clear the information was
6. If information is missing or unclear, use empty arrays or empty strings
7. For grading breakdown, use common category names like "assignments", "exams", "participation", "quizzes", "projects", etc.
8. Extract ALL teaching assistants listed, not just one
9. Pay special attention to TA assignment rules that indicate which students should contact which TA

Syllabus text to analyze:
${extractedText}
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1-2025-04-14",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that extracts structured information from academic syllabi. Always respond with valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      });

      const aiResponse = response.choices[0].message.content.trim();

      // Parse the JSON response
      let parsedData;
      try {
        parsedData = JSON.parse(aiResponse);
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", aiResponse);
        throw new Error("AI response was not valid JSON");
      }

      // Validate the response structure
      const validatedData = this.validateParsedData(parsedData);

      return validatedData;
    } catch (error) {
      console.error("Error parsing syllabus content:", error);
      throw new Error(`AI parsing failed: ${error.message}`);
    }
  }

  /**
   * Validate and sanitize the parsed data structure
   */
  validateParsedData(data) {
    const validated = {
      gradingBreakdown: new Map(),
      assignmentDates: [],
      examDates: [],
      contacts: [],
      confidence: 0,
    };

    // Validate grading breakdown
    if (data.gradingBreakdown && typeof data.gradingBreakdown === "object") {
      Object.entries(data.gradingBreakdown).forEach(([key, value]) => {
        if (typeof value === "number" && value >= 0 && value <= 100) {
          validated.gradingBreakdown.set(key, value);
        }
      });
    }

    // Validate assignment dates
    if (Array.isArray(data.assignmentDates)) {
      validated.assignmentDates = data.assignmentDates
        .filter((item) => item.title && item.dueDate)
        .map((item) => ({
          title: String(item.title).trim(),
          dueDate: this.validateDate(item.dueDate),
          description: String(item.description || "").trim(),
        }))
        .filter((item) => item.dueDate); // Remove items with invalid dates
    }

    // Validate exam dates
    if (Array.isArray(data.examDates)) {
      validated.examDates = data.examDates
        .filter((item) => item.title && item.date)
        .map((item) => ({
          title: String(item.title).trim(),
          date: this.validateDate(item.date),
          description: String(item.description || "").trim(),
        }))
        .filter((item) => item.date); // Remove items with invalid dates
    }

    // Validate contacts
    if (Array.isArray(data.contacts)) {
      validated.contacts = data.contacts
        .filter((item) => item.name && item.role)
        .map((item) => ({
          name: String(item.name).trim(),
          role: String(item.role).trim(),
          email: String(item.email || "").trim(),
          phone: String(item.phone || "").trim(),
        }));
    }

    // Validate confidence
    if (
      typeof data.confidence === "number" &&
      data.confidence >= 0 &&
      data.confidence <= 1
    ) {
      validated.confidence = data.confidence;
    }

    return validated;
  }

  /**
   * Validate and format date strings
   */
  validateDate(dateString) {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return null;
      }
      // Return ISO date string (YYYY-MM-DD format)
      return date.toISOString().split("T")[0];
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if the AI service is properly configured
   */
  isConfigured() {
    return !!process.env.OPENAI_API_KEY;
  }
}

module.exports = new AIService();
