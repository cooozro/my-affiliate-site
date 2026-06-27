/**
 * Prevent topic/category clustering in draft and publish queues.
 * Max 2 consecutive same topic id, category, or topic cluster (3rd blocked).
 */

export const MAX_CONSECUTIVE_SAME_TOPIC = 2;
export const MAX_CONSECUTIVE_SAME_CATEGORY = 2;
export const MAX_CONSECUTIVE_SAME_CLUSTER = 2;

/** @typedef {{ id: string, category?: string, cluster?: string, at?: string }} TopicHistoryEntry */

/**
 * @param {TopicHistoryEntry[]} history
 * @param {(entry: TopicHistoryEntry) => string | undefined} getKey
 * @param {string | undefined} key
 */
export function trailingConsecutiveCount(history, getKey, key) {
  if (!key || history.length === 0) return 0;

  let count = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (getKey(history[i]) === key) count += 1;
    else break;
  }
  return count;
}

/**
 * @param {object} topic
 * @param {TopicHistoryEntry[]} history
 */
export function wouldViolateTopicDiversity(topic, history) {
  const recent = history ?? [];

  if (
    trailingConsecutiveCount(recent, (e) => e.id, topic.id) >=
    MAX_CONSECUTIVE_SAME_TOPIC
  ) {
    return { blocked: true, reason: `topic id "${topic.id}" already ${MAX_CONSECUTIVE_SAME_TOPIC}x in a row` };
  }

  if (
    topic.category &&
    trailingConsecutiveCount(recent, (e) => e.category, topic.category) >=
      MAX_CONSECUTIVE_SAME_CATEGORY
  ) {
    return {
      blocked: true,
      reason: `category "${topic.category}" already ${MAX_CONSECUTIVE_SAME_CATEGORY}x in a row`,
    };
  }

  const cluster = topic.topicCluster ?? topic.cluster;
  if (
    cluster &&
    trailingConsecutiveCount(recent, (e) => e.cluster, cluster) >=
      MAX_CONSECUTIVE_SAME_CLUSTER
  ) {
    return {
      blocked: true,
      reason: `cluster "${cluster}" already ${MAX_CONSECUTIVE_SAME_CLUSTER}x in a row`,
    };
  }

  return { blocked: false };
}

/**
 * @param {object[]} candidates
 * @param {TopicHistoryEntry[]} history
 */
export function filterByTopicDiversity(candidates, history) {
  const allowed = candidates.filter(
    (t) => !wouldViolateTopicDiversity(t, history).blocked,
  );
  return allowed.length > 0 ? allowed : candidates;
}

/**
 * @param {object} state
 * @param {object} topic
 */
export function recordTopicPick(state, topic) {
  const entry = {
    id: topic.id,
    category: topic.category,
    cluster: topic.topicCluster ?? topic.cluster,
    at: new Date().toISOString(),
  };

  state.topicHistory = [...(state.topicHistory ?? []), entry].slice(-30);
  return entry;
}

/**
 * Build history tail from automation state + optional draft slugs.
 * @param {object} state
 */
export function getTopicHistory(state) {
  if (state.topicHistory?.length) {
    return state.topicHistory;
  }

  const fromWrites = (state.history ?? [])
    .filter((h) => h.action === "write" && h.topic)
    .map((h) => ({ id: h.topic, at: h.at }));

  return fromWrites;
}
