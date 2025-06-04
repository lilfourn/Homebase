const { Tool } = require("@langchain/core/tools");
const { z } = require("zod");
const babel = require("@babel/standalone");
const crypto = require("crypto");

const ReactPreviewSchema = z.object({
  code: z.string().describe("React component code"),
  props: z.record(z.any()).optional().describe("Props for the component"),
  dependencies: z
    .array(z.string())
    .optional()
    .describe("NPM packages to include"),
});

class ReactPreviewTool extends Tool {
  constructor() {
    super();
    this.name = "react_preview";
    this.description =
      "Generate a preview of React components with live rendering";
    this.schema = ReactPreviewSchema;
    this.previews = new Map(); // Store previews in memory
  }

  async _call(input) {
    try {
      const { code, props = {}, dependencies = [] } = input;

      // Transform JSX to JavaScript
      const transformedCode = babel.transform(code, {
        presets: ["react", "es2015", "stage-3"],
        plugins: ["transform-modules-umd"],
      }).code;

      // Generate unique preview ID
      const previewId = crypto.randomBytes(16).toString("hex");

      // Create preview HTML
      const html = this.generatePreviewHTML(
        transformedCode,
        props,
        dependencies
      );

      // Store preview
      this.previews.set(previewId, {
        html,
        createdAt: new Date(),
        code: input.code,
      });

      // Clean old previews
      this.cleanOldPreviews();

      return JSON.stringify({
        success: true,
        previewId,
        previewUrl: `/api/agents/preview/${previewId}`,
        html,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error.message,
      });
    }
  }

  generatePreviewHTML(code, props, dependencies) {
    // Map common dependencies to CDN URLs
    const cdnMap = {
      lodash: "https://cdn.jsdelivr.net/npm/lodash@4/lodash.min.js",
      axios: "https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js",
      moment: "https://cdn.jsdelivr.net/npm/moment@2/moment.min.js",
      "chart.js": "https://cdn.jsdelivr.net/npm/chart.js",
    };

    const dependencyScripts = dependencies
      .map((dep) =>
        cdnMap[dep] ? `<script src="${cdnMap[dep]}"></script>` : ""
      )
      .join("\n");

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React Component Preview</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  ${dependencyScripts}
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2/dist/tailwind.min.css" rel="stylesheet">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f7fafc;
    }
    #root {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 2rem;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }
    .error-boundary {
      color: #e53e3e;
      padding: 1rem;
      border: 1px solid #feb2b2;
      border-radius: 0.25rem;
      background: #fff5f5;
    }
  </style>
</head>
<body>
  <div id="root">
    <div class="text-center text-gray-500">Loading component...</div>
  </div>
  
  <script type="text/babel">
    // Error Boundary Component
    class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }
      
      static getDerivedStateFromError(error) {
        return { hasError: true, error };
      }
      
      render() {
        if (this.state.hasError) {
          return (
            <div className="error-boundary">
              <h2>Component Error</h2>
              <pre>{this.state.error?.toString()}</pre>
            </div>
          );
        }
        return this.props.children;
      }
    }
    
    // User's component code
    ${code}
    
    // Render the component
    const props = ${JSON.stringify(props)};
    const root = ReactDOM.createRoot(document.getElementById('root'));
    
    // Try to find the exported component
    const componentName = Object.keys(window).find(key => 
      key !== 'ErrorBoundary' && 
      typeof window[key] === 'function' && 
      key[0] === key[0].toUpperCase()
    ) || 'App';
    
    const Component = window[componentName] || (() => <div>No component found</div>);
    
    root.render(
      <ErrorBoundary>
        <Component {...props} />
      </ErrorBoundary>
    );
  </script>
</body>
</html>
    `;
  }

  getPreview(previewId) {
    return this.previews.get(previewId);
  }

  cleanOldPreviews() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [id, preview] of this.previews.entries()) {
      if (preview.createdAt < oneHourAgo) {
        this.previews.delete(id);
      }
    }
  }
}

module.exports = ReactPreviewTool;
