async function isSmartContextEnabled(supabase, teamId) {
  try {
    const { data, error } = await supabase
      .from("installations")
      .select("enable_smart_context")
      .eq("team_id", teamId)
      .single();
      console.log(data)
    if (error) throw error;
    return data?.enable_smart_context ?? false;
  } catch (err) {
    console.error("⚠️ Error fetching Smart Context status:", err);
    return false;
  }
}

/**
 * Toggle Smart Context flag and record timestamp.
 */
async function setSmartContext(supabase, teamId, enabled) {
  try {
    const updates = {
      enable_smart_context: enabled,
      context_last_toggled_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("installations")
      .update(updates)
      .eq("team_id", teamId);
    if (error) throw error;
  } catch (err) {
    console.error(
      `⚠️ Error setting Smart Context=${enabled} for ${teamId}:`,
      err
    );
    throw err;
  }
}
module.exports = { isSmartContextEnabled, setSmartContext };
