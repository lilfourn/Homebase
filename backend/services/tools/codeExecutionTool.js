const { Tool } = require("@langchain/core/tools");
const { z } = require("zod");
const vm = require("vm");
const { NodeVM } = require("vm2");

// Code execution schema
const CodeExecutionSchema = z.object({
  code: z.string().describe("The code to execute"),
  language: z.enum(["javascript", "nodejs"]).default("javascript"),
  timeout: z
    .number()
    .default(5000)
    .describe("Execution timeout in milliseconds"),
});

class CodeExecutionTool extends Tool {
  constructor() {
    super();
    this.name = "code_executor";
    this.description = "Execute JavaScript/Node.js code in a secure sandbox";
    this.schema = CodeExecutionSchema;
  }

  async _call(input) {
    try {
      const { code, language, timeout } = input;

      if (language === "nodejs") {
        // Use NodeVM for Node.js specific features
        const nodeVM = new NodeVM({
          console: "redirect",
          sandbox: {},
          timeout: timeout,
          require: {
            external: false,
            builtin: ["fs", "path", "util"],
            root: "./",
          },
        });

        const result = nodeVM.run(code, "execution.js");

        return JSON.stringify({
          success: true,
          result: result,
          output: nodeVM._stdout || "",
          error: null,
        });
      } else {
        // Use basic VM for client-side JavaScript
        const sandbox = {
          console: {
            log: (...args) => {
              this.output.push(args.join(" "));
            },
          },
          result: null,
        };

        this.output = [];

        const context = vm.createContext(sandbox);
        const script = new vm.Script(code);

        script.runInContext(context, { timeout });

        return JSON.stringify({
          success: true,
          result: sandbox.result,
          output: this.output.join("\n"),
          error: null,
        });
      }
    } catch (error) {
      return JSON.stringify({
        success: false,
        result: null,
        output: "",
        error: error.message,
      });
    }
  }
}

// E2B Cloud Execution Alternative
class E2BCodeExecutionTool extends Tool {
  constructor() {
    super();
    this.name = "e2b_code_executor";
    this.description =
      "Execute code in E2B cloud sandbox (supports multiple languages)";
    this.schema = z.object({
      code: z.string(),
      language: z.enum(["javascript", "python", "typescript", "java"]),
    });
  }

  async _call(input) {
    const { CodeInterpreter } = require("@e2b/code-interpreter");

    let interpreter;
    try {
      interpreter = await CodeInterpreter.create({
        apiKey: process.env.E2B_API_KEY,
      });

      const execution = await interpreter.notebook.execCell(input.code);

      return JSON.stringify({
        success: true,
        output: execution.logs.stdout || "",
        error: execution.error || null,
        results: execution.results,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error.message,
      });
    } finally {
      if (interpreter) {
        await interpreter.close();
      }
    }
  }
}

module.exports = { CodeExecutionTool, E2BCodeExecutionTool };
