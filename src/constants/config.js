const PROCESSING_MESSAGES = [
  "Thinking... 🤔",
  "Crunching data... ⚙️",
  "Consulting the AI oracle... 🔮",
  "Analyzing the matrix... 💻",
  "Summoning digital spirits... 👻",
  "Engaging hyperdrive... 🚀",
  "Decoding the universe... 🌌",
  "Brewing digital coffee... ☕",
  "Assembling the bits... 🧩",
  "Polishing the circuits... ✨",
  "Consulting the mainframe... 🤖",
  "Warping reality... 🌀",
  "Processing... ⏳",
];

const WELCOME_MESSAGE = {
  text: "Welcome message from Zap",
  blocks: [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "⚡️ Zap has entered the chat!",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "*I'm Zap*, your intelligent assistant here to help your team search conversations, summarize threads, and surface the right context — fast.\n\nBy default, I don’t store any messages.",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "🔒 *Designed with your privacy in mind.*\nTo enable features like smart replies, deep search, and file-aware understanding, an admin can optionally allow short-term message storage — kept for no more than *20 days* and used strictly to enhance your workspace experience.",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "Your data stays within your workspace, and storage can be disabled at any time.",
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "🔓 Enable Smart Context",
            emoji: true,
          },
          style: "primary",
          action_id: "start_smart_context",
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "📄 View Privacy Policy",
            emoji: true,
          },
          url: "https://yourwebsite.com/privacy",
          action_id: "view_privacy",
        },
      ],
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text:
            "Only workspace admins can enable Smart Context. You can disable or adjust settings anytime with `/zap settings`.",
        },
      ],
    },
  ],
};
const SLACK_SCOPES = [
  "app_mentions:read",
  "channels:history",
  "channels:read",
  "chat:write",
  "commands",
  "files:read",
  "groups:history",
  "groups:read",
  "mpim:read",
  "remote_files:read",
  "users:read",
];


module.exports = {
  PROCESSING_MESSAGES,
  WELCOME_MESSAGE,
  SLACK_SCOPES
};
