# School Colors Service

This service uses OpenAI's structured output capabilities to fetch a school's official primary and secondary brand colors.

## Features

- **Structured Output**: Uses Zod schema validation to ensure consistent response format
- **Error Handling**: Comprehensive error handling with meaningful error messages
- **Confidence Scoring**: Provides confidence levels for color accuracy
- **Source Information**: Includes context about where colors are commonly used

## Usage

```javascript
import { getSchoolColors } from "./getSchoolColors.js";

const result = await getSchoolColors("Stanford University");

if (result.success) {
  console.log(result.data);
  // {
  //   primary_color: "#8C1515",
  //   secondary_color: "#FFFFFF",
  //   school_name: "Stanford University",
  //   confidence: 0.95,
  //   source: "official logo and athletic uniforms"
  // }
} else {
  console.error(result.error);
}
```

## Response Schema

```typescript
{
  success: boolean;
  data?: {
    primary_color: string;      // Hex color code (e.g., "#FF5733")
    secondary_color: string;    // Hex color code (e.g., "#33A1FF")
    school_name: string;        // Official school name
    confidence: number;         // Confidence level (0-1)
    source: string;            // Description of color usage
  };
  error?: string;              // Error message if success is false
}
```

## Integration Notes

- Requires OpenAI API key in environment variables
- Uses `gpt-4o-2024-08-06` model for optimal structured output support
- Returns hex color codes suitable for CSS/theming
- Handles invalid school names gracefully

## Testing

Run the test file to see the service in action:

```bash
node testSchoolColors.js
```

## Dependencies

- `openai`: Official OpenAI Node.js SDK
- `zod`: Schema validation for structured outputs
