const NoteTakerAgent = require("./noteTakerAgent");
const ResearcherAgent = require("./researcherAgent");
// const StudyBuddyAgent = require("./studyBuddyAgent");
// const AssignmentAgent = require("./assignmentAgent");

class AgentOrchestrator {
  constructor() {
    this.agents = {
      "note-taker": NoteTakerAgent,
      researcher: ResearcherAgent,
      // "study-buddy": StudyBuddyAgent,
      // "assignment": AssignmentAgent
    };
    this.logger = console;
  }

  async processTask({
    taskId,
    userId,
    courseInstanceId,
    agentType,
    config,
    files,
    progressCallback,
  }) {
    this.logger.info(
      `[AgentOrchestrator] Processing task ${taskId} with agent ${agentType}`
    );

    // Get the appropriate agent class
    const AgentClass = this.agents[agentType];
    if (!AgentClass) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    // Determine LLM provider based on config or default
    const llmProvider =
      config.llmProvider || process.env.DEFAULT_LLM_PROVIDER || "openai";

    // Create agent instance
    const agent = new AgentClass(llmProvider);

    // Prepare initial state
    const initialState = {
      taskId,
      userId,
      courseInstanceId,
      files,
      currentStep: "start",
      progress: 0,
      messages: [],
      customSettings: config, // Pass config as customSettings for agents
      ...config, // Also spread config for backward compatibility
    };

    // Debug log the files being passed
    this.logger.info(`[AgentOrchestrator] Files debug:`, {
      filesCount: files ? files.length : "undefined",
      filesPresent: !!files,
      firstFileKeys: files && files[0] ? Object.keys(files[0]) : "no files",
      taskId,
    });
    
    // Debug log the config
    this.logger.info(`[AgentOrchestrator] Config debug:`, {
      configPresent: !!config,
      configKeys: config ? Object.keys(config) : [],
      researchPrompt: config?.researchPrompt,
      customSettingsInConfig: config?.customSettings,
      taskId,
    });

    // Set up progress tracking
    if (progressCallback) {
      agent.progressCallback = progressCallback;
    }

    try {
      // Execute the agent workflow
      const result = await agent.execute(initialState);

      // Check if the agent failed and returned an error state
      if (!result.result || result.error) {
        const errorMsg = result.error || "Agent processing failed without result";
        this.logger.error(
          `[AgentOrchestrator] Task ${taskId} failed with error:`,
          errorMsg
        );
        throw new Error(errorMsg);
      }

      this.logger.info(
        `[AgentOrchestrator] Task ${taskId} completed successfully`
      );

      return {
        content: result.result.content,
        format: result.result.format,
        metadata: result.result.metadata,
        tokensUsed: result.tokensUsed,
        cost: result.cost,
        model: llmProvider,
      };
    } catch (error) {
      this.logger.error(`[AgentOrchestrator] Task ${taskId} failed:`, error);
      throw error;
    }
  }

  // Get available agents and their configurations
  getAvailableAgents() {
    return {
      "note-taker": {
        name: "Note Taker",
        description: "Extracts and organizes key information from documents",
        configOptions: {
          noteStyle: ["bullet", "outline", "paragraph"],
          summaryLength: ["brief", "moderate", "detailed"],
          includeFormulas: true,
        },
      },
      researcher: {
        name: "Researcher",
        description:
          "Analyzes multiple documents for research insights with web search capabilities",
        configOptions: {
          researchDepth: ["surface", "moderate", "deep"],
          includeWebSearch: true,
          includeCitations: true,
          compareSources: true,
          specificQuestions: [], // User can provide specific research questions
          webSearchQueries: [], // User can provide specific search queries
        },
      },
      "study-buddy": {
        name: "Study Buddy",
        description: "Creates study materials and practice questions",
        configOptions: {
          materialTypes: ["flashcards", "quiz", "summary"],
          difficulty: ["easy", "medium", "hard"],
          questionCount: 20,
        },
        comingSoon: true,
      },
      assignment: {
        name: "Assignment Assistant",
        description: "Helps plan and structure assignments",
        configOptions: {
          assignmentType: ["essay", "report", "presentation"],
          includeOutline: true,
          suggestThesis: true,
          citationStyle: ["APA", "MLA", "Chicago"],
        },
        comingSoon: true,
      },
    };
  }
}

module.exports = new AgentOrchestrator();
