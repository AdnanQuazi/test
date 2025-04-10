function buildHome(enabled, options = {}) {
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "⚡️ Zap Control Panel",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: enabled
          ? ":white_check_mark: *Smart Context is currently enabled.*\nZap is temporarily storing messages (up to 20 days) to help with deep search, file-aware summaries, and smart answers."
          : "🔒 *Smart Context is currently disabled.*\nEnable this to allow Zap to provide deep insights from your conversations by temporarily storing message history.",
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text:
            "Only workspace admins can toggle Smart Context. You can change this setting anytime.",
        },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: enabled
              ? "🔒 Disable Smart Context"
              : "🔓 Enable Smart Context",
            emoji: true,
          },
          style: enabled ? "danger" : "primary",
          action_id: enabled ? "disable_context" : "enable_context",
        },
      ],
    },
  ];
  if (options.error) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `⚠️ *${options.error}*`,
        },
      ],
    });
  }
  return {
    type: "home",
    callback_id: "home_view",
    blocks,
  };
}
module.exports = buildHome;
