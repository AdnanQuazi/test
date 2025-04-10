function appendQueryContext(blocks, query, note) {
  const updated = [...blocks, { type: "divider" }];
  updated.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: `*User Asked:* ${query}` }],
  });
  if (note) {
    updated.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `*Note:* ${note}` }],
    });
  }
  return updated;
}

module.exports = appendQueryContext;
