/** IT review topics rotated for AI Pick & Report */
export const POST_TOPICS = [
  {
    id: "wireless-earbuds",
    category: "audio",
    imageQuery: "wireless earbuds technology",
    liveData: true,
    angle: "budget wireless earbuds comparison with specs, battery, codec, and ANC data",
  },
  {
    id: "budget-smartphones",
    category: "smartphones",
    imageQuery: "smartphone comparison desk",
    liveData: true,
    angle: "best budget smartphones under a price tier with chipset, camera, and battery analysis",
  },
  {
    id: "power-banks",
    category: "accessories",
    imageQuery: "portable power bank charger",
    liveData: true,
    angle: "power bank buying guide: capacity, charging speed, port types, and safety certifications",
  },
  {
    id: "mechanical-keyboards",
    category: "peripherals",
    imageQuery: "mechanical keyboard workspace",
    liveData: false,
    angle: "entry-level mechanical keyboards compared by switch type, layout, and build quality",
  },
  {
    id: "budget-monitors",
    category: "displays",
    imageQuery: "computer monitor desk setup",
    liveData: true,
    angle: "budget monitors for work and gaming: panel type, resolution, refresh rate guide",
  },
  {
    id: "robot-vacuums",
    category: "smart-home",
    imageQuery: "robot vacuum smart home",
    liveData: true,
    angle: "robot vacuum comparison for apartments: suction, mapping, mop features, and maintenance",
  },
  {
    id: "bluetooth-speakers",
    category: "audio",
    imageQuery: "portable bluetooth speaker",
    liveData: true,
    angle: "portable Bluetooth speakers compared by sound, IP rating, and battery life",
  },
  {
    id: "fitness-trackers",
    category: "wearables",
    imageQuery: "fitness tracker smartwatch",
    liveData: true,
    angle: "budget fitness trackers: heart rate accuracy, sleep tracking, and app ecosystem",
  },
  {
    id: "usb-c-hubs",
    category: "accessories",
    imageQuery: "usb c hub laptop",
    liveData: false,
    angle: "USB-C hub buying guide for laptops: ports, power delivery, and compatibility",
  },
  {
    id: "air-purifiers",
    category: "home-appliances",
    imageQuery: "air purifier modern home",
    liveData: false,
    angle: "air purifier guide for small rooms: CADR, filter types, noise levels, and running costs",
  },
  {
    id: "tablet-budget",
    category: "tablets",
    imageQuery: "tablet reading study",
    liveData: true,
    angle: "budget tablets for reading and video: display, storage, stylus support comparison",
  },
  {
    id: "webcams",
    category: "peripherals",
    imageQuery: "webcam video conference",
    liveData: false,
    angle: "webcams for remote work: resolution, autofocus, microphone quality comparison",
  },
];

export function pickTopic(state) {
  const used = new Set(state.usedTopicIds ?? []);
  const available = POST_TOPICS.filter((t) => !used.has(t.id));

  if (available.length === 0) {
    state.usedTopicIds = [];
    return POST_TOPICS[state.topicIndex % POST_TOPICS.length];
  }

  const topic = available[0];
  state.topicIndex = (POST_TOPICS.findIndex((t) => t.id === topic.id) + 1) % POST_TOPICS.length;
  state.usedTopicIds = [...(state.usedTopicIds ?? []), topic.id].slice(-20);
  return topic;
}
