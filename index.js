require("dotenv").config();

const path = require("path");
const express = require("express");
const { WebClient } = require("@slack/web-api");

//Routers
const oauthRouter = require("./src/routes/oauth");

// Local utilities and pipelines
const extractAndParseJson = require("./src/utils/json-parser");
const parseQuery = require("./src/pipelines/search-pipeline");
const responseGenerationPrompt = require("./prompts/response-generation-prompt");
const shouldTriggerSync = require("./src/utils/sync-rate-limit");
const syncSlackMessages = require("./src/pipelines/sync-slack-messages-pipeline");

// Configuration and services
const { expressApp, app } = require("./src/config/slack");
const supabase = require("./src/config/supabase");

// Helpers and constants
const { PROCESSING_MESSAGES, WELCOME_MESSAGE} = require("./src/constants/config");
const buildHome = require("./src/UI/home");
const checkSmartContextCooldown = require("./src/helpers/context-cooldown");
const { setSmartContext, isSmartContextEnabled } = require("./src/helpers/db-helpers");
const isUserAdmin = require("./src/helpers/slack-helpers");

// Google Generative AI client
const { GoogleGenerativeAI } = require("@google/generative-ai");
const appendQueryContext = require("./src/helpers/query-context");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Express middleware
expressApp.use(express.urlencoded({ extended: true }));
expressApp.use(express.json());
expressApp.set("view engine", "ejs");
expressApp.set("views", path.resolve(__dirname, "views"));

// Utility to build prompt and get AI response
async function askGemini(query, context, subdomain, channelId) {
  try {
    const prompt = responseGenerationPrompt(query, context, subdomain, channelId);
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("Gemini error:", err);
    return "Sorry, I couldn't process that request.";
  }
}


// Mount all OAuth routes at /slack
expressApp.use("/slack", oauthRouter);

// Helper to append context to blocks


// Slack event: Bot joined a channel
app.event("member_joined_channel", async ({ event, context, logger }) => {
  if (event.user !== context.userId) return;

  logger.info(`Bot joined channel ${event.channel}`);
  const client = new WebClient(context.botToken);

  try {
    await client.chat.postMessage({ channel: event.channel, ...WELCOME_MESSAGE });
    // await syncSlackMessages(client, event.channel, context.botToken);
  } catch (err) {
    logger.error(`Sync error: ${err}`);
  }
});

// Slack event: Mention
app.event("app_mention", async ({ event, say, context }) => {
  const botToken = context.botToken;
  if (!botToken) return console.error(`No bot token for ${event.team}`);

  try {
    await say(`Hey <@${event.user}>, how can I help you today?`);
  } catch (err) {
    console.error("Mention handler error:", err);
  }
});

// Slash command: /ask
app.command("/ask", async ({ command, ack, say, respond, context }) => {
  await ack();
  const client = new WebClient(context.botToken);
  const channel = command.channel_id;
  const text = command.text;
  const teamId = context.teamId
  const userId = context.userId
  if(!await isSmartContextEnabled(supabase,teamId)){
    await respond({
      response_type: "ephemeral",
      text: "⚠️ Please ask an admin to enable *Smart Context* to use this command.",
    });
    return;
  }
  // Show processing message
  const processingText = PROCESSING_MESSAGES[Math.floor(Math.random() * PROCESSING_MESSAGES.length)];
  const processingMessage = await client.chat.postEphemeral({
    channel,
    user: userId,
    text: processingText,
  });
  // Optionally sync messages
  if (shouldTriggerSync(channel)) {
    await syncSlackMessages(client, channel, context.botToken);
  }

  try {
    const slackContext = await parseQuery({ query: text, channelId: channel });
    const aiResponse = await askGemini(text, slackContext, command.team_domain, channel);
    const parsed = await extractAndParseJson(aiResponse);
    const blocks = appendQueryContext(parsed.blocks, text, slackContext.note);
    await client.chat.postEphemeral({ channel, user : userId ,blocks, text: "Zap wants to say something" });
  } catch (err) {
    console.error("/ask error:", err);
    await client.chat.postEphemeral({ channel, user : userId, text: "An error occurred during processing." });
  }
});

// Home tab
app.event("app_home_opened", async ({ event, client }) => {
  try {
    const enabled = await isSmartContextEnabled(supabase, event.view.team_id);
    await client.views.publish({ user_id: event.user, view: buildHome(enabled) });
  } catch (err) {
    console.error("Home tab publish error:", err);
  }
});

// Toggle Smart Context
async function handleContextToggle({ ack, body, client }, enable) {
  await ack();
  const teamId = body.team.id;
  const userId = body.user.id;

  if (!(await isUserAdmin(client, userId))) {
    return client.views.publish({ user_id: userId, view: buildHome(!enable, { error: "❌ Only workspace admins can change Smart Context." }) });
  }

  const cooldown = await checkSmartContextCooldown(teamId);
  if (!cooldown.allowed) {
    return client.views.publish({ user_id: userId, view: buildHome(!enable, { error: cooldown.reason }) });
  }

  try {
    await setSmartContext(supabase, teamId, enable);
    await client.views.publish({ user_id: userId, view: buildHome(enable) });
  } catch (err) {
    console.error(`Toggle context error (${enable}):`, err);
    await client.views.publish({ user_id: userId, view: buildHome(!enable, { error: "⚠️ Something went wrong. Please try again later." }) });
  }
}

app.action("enable_context", (args) => handleContextToggle(args, true));
app.action("disable_context", (args) => handleContextToggle(args, false));

// 404 handler
expressApp.use((req, res) => {
  res.status(404).send("404 - Not Found");
});

// Start server
const PORT = process.env.PORT || 3000;
expressApp.listen(PORT, () => console.log(`Express server running on port ${PORT}`));
