/**
 * Infer topic metadata from a post slug + frontmatter for publish diversity checks.
 */

import { PRODUCT_TOPICS } from "./product-taxonomy.mjs";

const TOPIC_IDS_BY_LENGTH = [...PRODUCT_TOPICS.map((t) => t.id)].sort(
  (a, b) => b.length - a.length,
);

const TOPIC_BY_ID = new Map(PRODUCT_TOPICS.map((t) => [t.id, t]));

const RULES = [
  {
    pattern: /portable.*window|window.*portable|vs-window|vs-portable/i,
    id: "portable-ac",
    category: "home-appliances",
    cluster: "air-conditioning",
  },
  {
    pattern: /window-ac|window-air|through-wall|u-shaped.*ac|slider.*ac/i,
    id: "window-ac",
    category: "home-appliances",
    cluster: "air-conditioning",
  },
  {
    pattern: /portable-ac|portable-air|mobile-air/i,
    id: "portable-ac",
    category: "home-appliances",
    cluster: "air-conditioning",
  },
  {
    pattern: /summer-ac|ac-buying|ac-room|btu.*ac|ac.*btu|air-condition/i,
    id: "portable-ac",
    category: "home-appliances",
    cluster: "air-conditioning",
  },
  {
    pattern: /electric-fan|desk-fan|tower-fan/i,
    id: "electric-fans",
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
    pattern: /air-purifier|air-purifiers/i,
    id: "air-purifiers",
    category: "home-appliances",
    cluster: "air-quality",
  },
  {
    pattern: /dehumidifier/i,
    id: "dehumidifiers",
    category: "home-appliances",
    cluster: "air-quality",
  },
  {
    pattern: /robot-vacuum|robot-vacuums/i,
    id: "robot-vacuums",
    category: "smart-home",
    cluster: "floor-care",
  },
  {
    pattern: /cordless-vacuum|stick-vacuum/i,
    id: "cordless-vacuums",
    category: "smart-home",
    cluster: "floor-care",
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
  {
    pattern: /action-cam|action-camera/i,
    id: "action-cameras",
    category: "cameras",
    cluster: "cameras",
  },
  {
    pattern: /noise-cancelling|noise-canceling|headphone/i,
    id: "noise-cancelling-headphones",
    category: "audio",
    cluster: "audio",
  },
  {
    pattern: /gaming-console|playstation|xbox|nintendo/i,
    id: "gaming-consoles",
    category: "gaming",
    cluster: "gaming",
  },
  {
    pattern: /laptop/i,
    id: "laptops",
    category: "computing",
    cluster: "computing",
  },
  {
    pattern: /usb-c-hub|usb-c hub/i,
    id: "usb-c-hubs",
    category: "accessories",
    cluster: "computing",
  },
  {
    pattern: /portable-ssd|portable ssd/i,
    id: "portable-ssd",
    category: "storage",
    cluster: "computing",
  },
  {
    pattern: /webcam/i,
    id: "webcams",
    category: "peripherals",
    cluster: "computing",
  },
  {
    pattern: /rice-cooker|rice cooker/i,
    id: "rice-cookers",
    category: "kitchen",
    cluster: "kitchen",
  },
  {
    pattern: /air-fryer/i,
    id: "air-fryers",
    category: "kitchen",
    cluster: "kitchen",
  },
  {
    pattern: /coffee-machine|espresso/i,
    id: "coffee-machines",
    category: "kitchen",
    cluster: "kitchen",
  },
];

function inferTopicIdFromSlug(slug) {
  const normalized = String(slug ?? "").toLowerCase();
  for (const id of TOPIC_IDS_BY_LENGTH) {
    if (normalized.includes(id)) return id;
  }
  return null;
}

function topicMetaFromId(id) {
  const topic = TOPIC_BY_ID.get(id);
  return {
    id,
    category: topic?.category,
    cluster: topic?.topicCluster ?? topic?.cluster,
  };
}

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

  const fromSlug = inferTopicIdFromSlug(slug);
  if (fromSlug) {
    return topicMetaFromId(fromSlug);
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
