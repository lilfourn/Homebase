import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getSchoolColors } from "./getSchoolColors.js";

// Determine the correct path to the .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env"); // Moves two directories up to the backend root

dotenv.config({ path: envPath });

async function testSchoolColors() {
  console.log("Testing school colors service...\n");

  const testSchools = [
    "University of California, Los Angeles",
    "Stanford University",
    "Harvard University",
    "Invalid School Name 123",
  ];

  for (const school of testSchools) {
    console.log(`\n🔍 Fetching colors for: ${school}`);
    console.log("─".repeat(50));

    const result = await getSchoolColors(school);

    if (result.success) {
      const { data } = result;
      console.log(`✅ Success!`);
      console.log(`School: ${data.school_name}`);
      console.log(`Primary Color: ${data.primary_color}`);
      console.log(`Secondary Color: ${data.secondary_color}`);
      console.log(`Confidence: ${(data.confidence * 100).toFixed(1)}%`);
      console.log(`Source: ${data.source}`);
    } else {
      console.log(`❌ Error: ${result.error}`);
    }
  }
}

testSchoolColors().catch(console.error);
