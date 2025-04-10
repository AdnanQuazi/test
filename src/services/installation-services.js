const supabase = require("../config/supabase")

async function storeInstallation(installation) {
  // Get team id from installation
  const teamId = installation.team?.id || installation.enterprise?.id;
  if (!teamId) throw new Error("No team id found in installation data.");

  const { error } = await supabase.from("installations").upsert({
    team_id: teamId,
    access_token: installation.access_token,
    bot_user_id: installation.bot_user_id,
    team_name: installation.team ? installation.team.name : null,
    data: installation, // optional: store entire installation
  });

  if (error) {
    console.error("Supabase storeInstallation error:", error);
    throw error;
  }
}

// Fetch installation data from Supabase
async function fetchInstallation(query) {
  const teamId = query.teamId || query.enterpriseId;
  if (!teamId) throw new Error("No team id provided for fetchInstallation.");

  const { data, error } = await supabase
    .from("installations")
    .select("*")
    .eq("team_id", teamId)
    .single();

  if (error) {
    console.error("Supabase fetchInstallation error:", error);
    throw error;
  }

  return data;
}

// Delete installation data from Supabase
async function deleteInstallation(query) {
  const teamId = query.teamId || query.enterpriseId;
  if (!teamId) throw new Error("No team id provided for deleteInstallation.");

  const { error } = await supabase
    .from("installations")
    .delete()
    .eq("team_id", teamId);

  if (error) {
    console.error("Supabase deleteInstallation error:", error);
    throw error;
  }
}
module.exports = {
  storeInstallation,
  fetchInstallation,
  deleteInstallation,
};
