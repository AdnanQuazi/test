require("dotenv").config();
const { App, ExpressReceiver, LogLevel } = require("@slack/bolt");
const {
  fetchInstallation,
  storeInstallation,
  deleteInstallation,
} = require("../services/installation-services");

// Create an ExpressReceiver to integrate Bolt with Express
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  endpoints: "/slack/events",
});

// Initialize Bolt App for multi-workspace installation without a static token
const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SLACK_STATE_SECRET,
  scopes: [
    "chat:write",
    "chat:write.public",
    "channels:join",
    "channels:read",
    "groups:read",
  ],
  installationStore: {
    storeInstallation,
    fetchInstallation,
    deleteInstallation,
  },
  // The authorize callback is required for multi-workspace apps
  authorize: async ({ teamId, enterpriseId }) => {
    console.log("Authorize callback called with:", { teamId, enterpriseId });
    let installation;
    if (enterpriseId !== undefined) {
      installation = await fetchInstallation({
        isEnterpriseInstall: true,
        enterpriseId,
      });
    } else if (teamId !== undefined) {
      installation = await fetchInstallation({ teamId });
    }
    console.log("Fetched installation:", installation);
    if (!installation || !installation.access_token) {
      throw new Error("Failed to fetch installation data.");
    }
    return { botToken: installation.access_token };
  },
  installerOptions: {
    // directInstall: true, // Optional: remove to show the "Add to Slack" page
  },
  receiver,
});

// Use the Express app provided by the receiver
const expressApp = receiver.app;

module.exports = {app , expressApp}