// backend/services/tools/gmailTool.js
const { Tool } = require("@langchain/core/tools");
const { z } = require("zod");
const { google } = require("googleapis");

class GmailSearchTool extends Tool {
  constructor() {
    super();
    this.name = "gmail_search";
    this.description = "Search Gmail messages with advanced filters";
    this.schema = z.object({
      query: z.string().describe("Gmail search query"),
      maxResults: z.number().default(10),
      includeBody: z.boolean().default(true),
    });
  }

  async _call(input, runManager, userId) {
    try {
      const auth = await this.getAuthForUser(userId);
      const gmail = google.gmail({ version: "v1", auth });

      const response = await gmail.users.messages.list({
        userId: "me",
        q: input.query,
        maxResults: input.maxResults,
      });

      if (!response.data.messages) {
        return JSON.stringify({ success: true, messages: [] });
      }

      const messages = await Promise.all(
        response.data.messages.map(async (msg) => {
          const fullMessage = await gmail.users.messages.get({
            userId: "me",
            id: msg.id,
          });

          return this.parseMessage(fullMessage.data, input.includeBody);
        })
      );

      return JSON.stringify({
        success: true,
        messages,
        count: messages.length,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error.message,
      });
    }
  }

  async getAuthForUser(userId) {
    // Get user's Google tokens from MongoDB
    const User = require("../../models/users.model");
    const user = await User.findOne({ userId }).select(
      "+googleDrive.accessToken +googleDrive.refreshToken"
    );

    if (!user?.googleDrive?.accessToken) {
      throw new Error("Google account not connected");
    }

    const { JWT } = require("google-auth-library");
    return new JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/gmail.modify"],
      subject: user.email, // Impersonate the user
    });
  }

  parseMessage(message, includeBody) {
    const headers = message.payload?.headers || [];
    const getHeader = (name) =>
      headers.find((h) => h.name === name)?.value || "";

    const parsed = {
      id: message.id,
      threadId: message.threadId,
      subject: getHeader("Subject"),
      from: getHeader("From"),
      to: getHeader("To"),
      date: getHeader("Date"),
      snippet: message.snippet,
    };

    if (includeBody) {
      parsed.body = this.extractBody(message.payload);
    }

    return parsed;
  }

  extractBody(payload) {
    if (!payload) return "";

    if (payload.body?.data) {
      return Buffer.from(payload.body.data, "base64").toString();
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          return Buffer.from(part.body.data, "base64").toString();
        }
      }
    }

    return "";
  }
}

class GmailComposeTool extends Tool {
  constructor() {
    super();
    this.name = "gmail_compose";
    this.description = "Compose and send Gmail messages";
    this.schema = z.object({
      to: z.array(z.string().email()).describe("Recipients"),
      subject: z.string(),
      body: z.string(),
      cc: z.array(z.string().email()).optional(),
      bcc: z.array(z.string().email()).optional(),
      attachments: z
        .array(
          z.object({
            filename: z.string(),
            content: z.string(),
            encoding: z.enum(["base64", "utf8"]).default("utf8"),
          })
        )
        .optional(),
      send: z
        .boolean()
        .default(false)
        .describe("Send immediately or save as draft"),
    });
  }

  async _call(input, runManager, userId) {
    try {
      const auth = await new GmailSearchTool().getAuthForUser(userId);
      const gmail = google.gmail({ version: "v1", auth });

      const message = this.createMessage(input);

      if (input.send) {
        const response = await gmail.users.messages.send({
          userId: "me",
          requestBody: {
            raw: message,
          },
        });

        return JSON.stringify({
          success: true,
          messageId: response.data.id,
          status: "sent",
        });
      } else {
        const response = await gmail.users.drafts.create({
          userId: "me",
          requestBody: {
            message: {
              raw: message,
            },
          },
        });

        return JSON.stringify({
          success: true,
          draftId: response.data.id,
          status: "draft",
        });
      }
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error.message,
      });
    }
  }

  createMessage(input) {
    const boundary = "boundary_" + Date.now();
    const headers = [
      `To: ${input.to.join(", ")}`,
      `Subject: ${input.subject}`,
      `MIME-Version: 1.0`,
    ];

    if (input.cc?.length) {
      headers.push(`Cc: ${input.cc.join(", ")}`);
    }

    if (input.bcc?.length) {
      headers.push(`Bcc: ${input.bcc.join(", ")}`);
    }

    if (input.attachments?.length) {
      headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);

      let message = headers.join("\n") + "\n\n";

      // Body part
      message += `--${boundary}\n`;
      message += `Content-Type: text/plain; charset="UTF-8"\n\n`;
      message += input.body + "\n";

      // Attachments
      for (const attachment of input.attachments) {
        message += `--${boundary}\n`;
        message += `Content-Type: application/octet-stream\n`;
        message += `Content-Transfer-Encoding: base64\n`;
        message += `Content-Disposition: attachment; filename="${attachment.filename}"\n\n`;

        const content =
          attachment.encoding === "base64"
            ? attachment.content
            : Buffer.from(attachment.content).toString("base64");

        message += content + "\n";
      }

      message += `--${boundary}--`;

      return Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    } else {
      headers.push(`Content-Type: text/plain; charset="UTF-8"`);
      const message = headers.join("\n") + "\n\n" + input.body;

      return Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    }
  }
}

module.exports = { GmailSearchTool, GmailComposeTool };
