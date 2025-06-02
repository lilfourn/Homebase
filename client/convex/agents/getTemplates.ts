import { v } from "convex/values";
import { query } from "../_generated/server";

export const getTemplates = query({
  args: {
    userId: v.optional(v.string()),
    agentType: v.optional(v.string()),
    isPublic: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    let templatesQuery = ctx.db.query("agentTemplates");
    
    // Get templates based on filters
    const templates = await templatesQuery.collect();
    
    let filteredTemplates = templates;
    
    // Filter by public/private and user
    if (args.isPublic !== undefined) {
      filteredTemplates = filteredTemplates.filter(
        template => template.isPublic === args.isPublic
      );
    }
    
    // Include user's private templates and all public templates
    if (args.userId) {
      filteredTemplates = filteredTemplates.filter(
        template => template.isPublic || template.userId === args.userId
      );
    } else {
      // If no userId provided, only show public templates
      filteredTemplates = filteredTemplates.filter(
        template => template.isPublic
      );
    }
    
    // Filter by agent type if specified
    if (args.agentType) {
      filteredTemplates = filteredTemplates.filter(
        template => template.agentType === args.agentType
      );
    }
    
    // Sort by creation time (newest first) and popularity
    filteredTemplates.sort((a, b) => {
      // Public templates first, then by creation time
      if (a.isPublic !== b.isPublic) {
        return a.isPublic ? -1 : 1;
      }
      return b._creationTime - a._creationTime;
    });
    
    // Return with some default system templates if none exist
    if (filteredTemplates.length === 0 && args.agentType) {
      // Return default templates based on agent type
      const defaultTemplates = getDefaultTemplates(args.agentType);
      return defaultTemplates;
    }
    
    return filteredTemplates;
  },
});

// Helper function to provide default templates
function getDefaultTemplates(agentType: string) {
  const defaults: Record<string, any[]> = {
    "note-taker": [
      {
        name: "Detailed Lecture Notes",
        agentType: "note-taker",
        config: {
          mode: "detailed",
          model: "gpt-4",
          customSettings: {
            format: "outline",
            includeExamples: true,
            highlightKeyTerms: true
          }
        },
        isPublic: true,
        userId: null,
        _id: "default-note-detailed",
        _creationTime: Date.now()
      },
      {
        name: "Summary Notes",
        agentType: "note-taker",
        config: {
          mode: "quick",
          model: "gpt-3.5-turbo",
          customSettings: {
            format: "bullet-points",
            maxLength: 500
          }
        },
        isPublic: true,
        userId: null,
        _id: "default-note-summary",
        _creationTime: Date.now()
      }
    ],
    "researcher": [
      {
        name: "Literature Review",
        agentType: "researcher",
        config: {
          mode: "deep",
          model: "gpt-4",
          customSettings: {
            includeCitations: true,
            compareContrast: true,
            identifyGaps: true
          }
        },
        isPublic: true,
        userId: null,
        _id: "default-research-litreview",
        _creationTime: Date.now()
      }
    ],
    "study-buddy": [
      {
        name: "Exam Prep - Multiple Choice",
        agentType: "study-buddy",
        config: {
          mode: "standard",
          model: "gpt-4",
          customSettings: {
            questionType: "multiple-choice",
            difficulty: "medium",
            numberOfQuestions: 20
          }
        },
        isPublic: true,
        userId: null,
        _id: "default-study-mc",
        _creationTime: Date.now()
      }
    ],
    "assignment": [
      {
        name: "Essay Outline",
        agentType: "assignment",
        config: {
          mode: "detailed",
          model: "gpt-4",
          customSettings: {
            includeThesis: true,
            paragraphCount: 5,
            citationStyle: "APA"
          }
        },
        isPublic: true,
        userId: null,
        _id: "default-assignment-essay",
        _creationTime: Date.now()
      }
    ]
  };
  
  return defaults[agentType] || [];
}