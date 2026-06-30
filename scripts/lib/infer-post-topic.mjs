/**
 * Infer topic metadata from a post slug + frontmatter for publish diversity checks.
 */

const RULES = [
  {
    pattern: /portable.*window|window.*portable|head-to-head.*ac/i,
    id: "portable-ac",
    category: "home-appliances",
    cluster: "air-conditioning",
  },
  {
    pattern: /summer-ac|ac-buying|ac-room|btu.*ac|ac.*btu|air-condition|portable-ac|window-ac/i,
    id: "portable-ac",
    category: "home-appliances",
    cluster: "air-conditioning",
  },
  {
    pattern: /bluetooth-speaker|portable-speaker/i,
    id: "bluetooth-speakers",
    category: "audio",
    cluster: "audio",
  },
  {
    pattern: /wireless-earbud|earbuds/i,
    id: "wireless-earbuds",
    category: "audio",
    cluster: "audio",
  },
  {
    pattern: /smartphone/i,
    id: "budget-smartphones",
    category: "smartphones",
    cluster: "smartphones",
  },
  {
    pattern: /power-bank/i,
    id: "power-banks",
    category: "accessories",
    cluster: "power",
  },
  {
    pattern: /keyboard/i,
    id: "mechanical-keyboards",
    category: "peripherals",
    cluster: "computing",
  },
  {
    pattern: /monitor/i,
    id: "budget-monitors",
    category: "displays",
    cluster: "computing",
  },
];

/**
 * @param {string} slug
 * @param {{ title?: string, tags?: string[], topicId?: string, topicCluster?: string }} [data]
 */
export function inferPostTopic(slug, data = {}) {
  if (data.topicId) {
    return {
      id: data.topicId,
      category: data.topicCluster ? undefined : data.category,
      cluster: data.topicCluster,
    };
  }

  const blob = [slug, data.title, ...(data.tags ?? [])].join(" ");

  for (const rule of RULES) {
    if (rule.pattern.test(blob)) {
      return {
        id: rule.id,
        category: rule.category,
        cluster: rule.cluster,
      };
    }
  }

  return {
    id: slug,
    category: undefined,
    cluster: undefined,
  };
}

/**
 * @param {object} state
 */
export function getPublishTopicHistory(state) {
  const fromHistory = (state.history ?? [])
    .filter((entry) => entry.action === "publish")
    .map((entry) => {
      if (entry.topic) {
        return {
          id: entry.topic.id,
          category: entry.topic.category,
          cluster: entry.topic.cluster,
          at: entry.at,
        };
      }

      return {
        ...inferPostTopic(entry.slug),
        at: entry.at,
      };
    });

  if (fromHistory.length > 0) {
    return fromHistory.slice(-30);
  }

  return (state.publishTopicHistory ?? []).slice(-30);
}
