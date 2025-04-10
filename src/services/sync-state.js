const supabase = require("../config/supabase");

async function getLastSyncState(channelId) {
    const { data, error } = await supabase
        .from("slack_sync_state")
        .select("last_main_ts, thread_ts_data")
        .eq("channel_id", channelId)
        .single();

    if (error) {
        console.error("Error fetching sync state:", error);
        return { lastMainTS: "0", threadTSData: {} };
    }

    return {
        lastMainTS: data.last_main_ts || "0",
        threadTSData: data.thread_ts_data || {},
    };
}

async function updateSyncState(channelId, lastMainTS, threadTSData) {
    const { error } = await supabase
        .from("slack_sync_state")
        .upsert({
            channel_id: channelId,
            last_main_ts: lastMainTS,
            thread_ts_data: threadTSData,
        });

    if (error) {
        console.error("Error updating sync state:", error);
    }
}

module.exports = {getLastSyncState , updateSyncState}