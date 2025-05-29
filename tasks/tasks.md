# Project Tasks: Enhanced Course Page Functionality

Based on the [Product Requirements Document (prd.md)](../prd.md).

## MVP Functional Requirements

### 7.1. File Management

- [x] **(P0)** Implement functionality for users to upload files (e.g., lecture notes, readings, assignments) specific to each course.
- [x] **(P0)** Ensure uploaded files are stored securely and correctly associated with the specific user and course in MongoDB.
- [x] **(P1)** Develop UI for users to view, download, and delete uploaded files.
- [x] **(P1)** Implement display of file type icons and last modified dates for uploaded files.

### 7.2. Syllabus Processing & Information Extraction

- [x] **(P0)** Enable users to upload a course syllabus (e.g., PDF, DOCX).
- [x] **(P0)** Integrate an AI service for parsing and indexing syllabus content.
- [x] **(P0)** Implement automatic extraction of:
  - [x] Grading breakdown and weights.
  - [x] Assignment due dates.
  - [x] Exam dates.
  - [x] TA contact information (name, email if available).
  - [x] Professor contact information (name, email, phone number if available).
- [x] **(P0)** Display extracted dates (assignments, exams) on a calendar view within the course page.
- [x] **(P0)** Populate the "Task List" (see 7.3) with extracted assignment due dates.
- [ ] **(P0)** Display extracted contact information (TA, Professor) in a dedicated "Contacts" section.
- [x] **(P1)** Implement a mechanism for users to review and correct AI-extracted syllabus information.
- [ ] **(P2)** Notify users if the AI has low confidence in certain extracted syllabus details.

### 7.3. Task Management

- [ ] **(P0)** Allow users to manually add new tasks to a course-specific task list.
- [ ] **(P0)** Ensure each task entry supports a title, an optional description, and a due date.
- [ ] **(P0)** Automatically populate the task list with tasks generated from syllabus indexing.
- [ ] **(P0)** Implement functionality for users to mark tasks as complete (check off).
- [ ] **(P0)** Allow users to edit existing tasks (title, description, due date).
- [ ] **(P0)** Enable users to remove tasks from the list.
- [ ] **(P0)** Design and implement an organized and visually appealing task list UI, clearly indicating overdue, upcoming, and completed tasks.
- [ ] **(P1)** Implement task prioritization (e.g., high, medium, low).
- [ ] **(P1)** Implement sorting and filtering options for the task list (e.g., by due date, priority, status).

### 7.4. AI Agent for Assignment Assistance

- [ ] **(P1)** Enable users to create "AI Agents" for specific courses.
- [ ] **(P1)** For agent creation, allow users to:
  - [ ] Provide a name or purpose for the agent.
  - [ ] Assign relevant uploaded files as context.
  - [ ] Input specific prompts or instructions.
  - [ ] Upload screenshots as context.
- [ ] **(P1)** Implement background processing for the AI agent to generate output based on user inputs.
- [ ] **(P1)** Display agent-generated output to the user within the course page.
- [ ] **(P2)** Allow users to iterate on agent outputs with further prompts or feedback.
- [ ] **(P2)** Provide transparency regarding AI limitations and potential for errors.

### 7.5. User Interface (UI) / User Experience (UX)

- [ ] **(P0)** Ensure all new functionalities are presented through a beautiful, intuitive, and responsive UI, consistent with Tailwind CSS & Shadcn UI.
- [ ] **(P0)** Implement full customization of course pages by the user (layout, section visibility for files, syllabus info, task list, agents).
- [ ] **(P0)** Ensure seamless navigation within the course page and to/from other platform parts.
- [ ] **(P0)** Ensure all interactive elements provide clear visual feedback and follow accessibility best practices (e.g., `cursor-pointer`).

### 7.6. Data Persistence

- [ ] **(P0)** Implement reliable saving of all user-specific information (files, syllabus data, tasks, agent configurations, customizations) in MongoDB.
- [ ] **(P0)** Ensure efficient loading of user-specific data when accessing a course page.

## Non-Functional Requirements (Considerations during development)

- [ ] **Performance:** Optimize course pages for quick loading times, even with extensive data. Ensure AI processing doesn't block UI.
- [ ] **Scalability:** Design the system to handle growth in users and courses.
- [ ] **Security:** Securely store all user data with proper access controls. Implement file upload scanning.
- [ ] **Reliability:** Aim for minimal downtime and ensure data integrity.
- [ ] **Maintainability:** Write well-structured, documented, and easily maintainable code.
