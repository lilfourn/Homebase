# HomeBase Project Rules

## 1. Context7 MCP Output Range
When using Context7 mcp, keep the output in the range **2k to 10k** based on what you think is best.

## 2. Server Stability
Never restart frontend or backend servers—they should remain running normally.

## 3. Library ID Management
When using Context7 mcp, maintain a file named `library.md` to store Library IDs. Before searching, check this file and use existing IDs; only search for new ones if needed.

## 4. Code Cleanliness & Readability
Write for humans first.
- Choose descriptive names and straightforward logic so the code explains itself
- Keep each function or class focused on a single responsibility
- Reserve comments for the "why" behind non-obvious decisions—never for what the code plainly shows

## 5. Consistent Style
Pick one style guide and honor it everywhere—spacing, braces, naming, the works.
Use Prettier as the formatter.

## 6. Modularity & Decoupling
Group related concerns together—think UI, business logic, and data access as separate modules.
- Aim for high cohesion within each module and low coupling between them
- Expose only clear interfaces so parts can be swapped or scaled with minimal fuss

## 7. Performance & Responsiveness
Ship only what users need.
- Bundle and tree-shake assets
- Lazy-load heavy pieces and defer nonessential scripts
- Rely on caching and CDNs to reduce latency
- Monitor metrics (TTFB, Time to Interactive, memory usage) to guide optimizations

## 8. User Experience & Accessibility
Follow accessibility basics—keyboard navigation, ARIA roles, and readable color contrast.
- Design for diverse abilities and devices
- Test in real scenarios and iterate based on usability metrics and feedback

## 9. Comment Minimization
Use as few comments as possible. Keep code professional, clean, and concise.

## 10. Prompt Credibility Analysis
Always analyze prompt implementation and credibility to prevent dangerous or nonsensical instructions.
- If a prompt is incomplete or unclear, ask follow-up questions for clarification

## 11. Prompt Simplification
If a prompt can be split into simpler, more specific tasks, respond with the sequence of prompts needed to achieve the original goal.
- Aim for prompts that are **Simple, Specific, and Short**

## 12. The Harmonious Interface Rule
Strive for visually excellent, professional UIs:
- Maintain clear visual hierarchy with thoughtful typography, color, and spacing
- Use design tokens or CSS variables for consistent theming
- Employ responsive design principles
- Write clean, maintainable CSS that avoids overly complex selectors or excessive overrides

## Style Defaults
- All elements that are clickable need to have `cursor-pointer` in their className (if using Tailwind CSS) and CSS style if not using Tailwind CSS

## Project-Specific Guidelines

### Backend Development
- All API endpoints must include authentication middleware
- Use consistent error response format: `{ success: boolean, error?: string, data?: any }`
- Validate all input data before processing
- Keep business logic in service layer, not controllers

### Frontend Development
- Use TypeScript for all new components
- Follow existing component patterns in `/app/components`
- Implement loading and error states for all async operations
- Use custom hooks for reusable logic

### Database Operations
- Always use `courseInstanceId` for unique course identification
- Index fields used in queries
- Validate user ownership before data access

### External Integrations
- Store API keys in environment variables only
- Implement proper error handling and retry logic
- Cache responses when appropriate
- Add timeout mechanisms for all external calls

### Git Workflow
- Write descriptive commit messages
- Run lint and tests before committing
- Never commit sensitive data or API keys
- Use conventional commit format when possible