const en = {
  meta: {
    siteDescription:
      "Public-spec buying guides for phones, gadgets, and home electronics — not a hands-on hardware lab.",
  },
  nav: {
    home: "Home",
    about: "About",
    contact: "Contact",
    mainMenu: "Main navigation",
  },
  footer: {
    menu: "Footer menu",
    privacy: "Privacy Policy",
    rss: "RSS",
    rights: "All rights reserved.",
    publicationTagline:
      "AI Pick & Report is an independent buying-guide desk that cross-checks public specs — not a hands-on hardware lab.",
  },
  home: {
    title: "Home",
    latestPosts: "Latest Articles",
    noPosts: "No articles published yet.",
    noPostsHint: "Add markdown files to content/posts/ and refresh.",
    readMore: "Read article",
    searchPlaceholder: "Search articles by title or topic…",
    searchLabel: "Search articles",
    searchNoResults: "No articles match your search.",
    moreArticles: "More articles",
  },
  blog: {
    notFound: "Article not found",
    published: "Published",
    updated: "Updated",
    share: {
      ariaLabel: "Share this article",
      heading: "Share this article",
      shareOn: "Share on",
      kakao: "KakaoTalk",
      copyLink: "Copy link",
      copied: "Copied!",
      copyFallback: "Copy this link:",
      feedHeading: "Follow this site",
      feedOn: "Subscribe on",
      feedly: "Feedly",
    },
  },
  ads: {
    top: "Top of article",
    middle: "Middle of article",
    bottom: "Bottom of article",
    placeholder: "Sponsored placement",
  },
  about: {
    title: "About Us",
    metaDescription:
      "Who publishes AI Pick & Report, how we cross-check public specs, and how to request a correction.",
  },
  contact: {
    title: "Contact",
    metaDescription:
      "Get in touch with the AI Pick & Report editorial team for questions, corrections, or partnership inquiries.",
    intro:
      "We welcome reader feedback, product tips, and partnership inquiries. Use the form below and include a reply email — the editorial team answers there.",
    formNotice:
      "The supported channel is this contact form. Include a reply email in the form and the editorial team will answer there.",
    emailLabel: "Your email",
    nameLabel: "Name",
    messageLabel: "Message",
    submit: "Send Message",
    submitting: "Sending...",
    successMessage:
      "Your message has been sent successfully. We will get back to you soon.",
    errorGeneric: "Failed to send your message. Please try again later.",
    errorNotConfigured:
      "The contact form is temporarily unavailable. Please try again later.",
    errorActivation:
      "The contact form needs one-time email activation. Check the editorial inbox (including spam) for the FormSubmit activation email, click the link, then try again.",
    responseTime: "We typically respond within 2–3 business days.",
  },
  privacy: {
    title: "Privacy Policy",
    metaDescription:
      "Privacy Policy for AI Pick & Report — how we collect, use, and protect your information.",
    lastUpdated: "Last updated: August 29, 2026",
    sections: {
      intro: {
        title: "Introduction",
        body: "AI Pick & Report (\"we\", \"us\", or \"our\") operates https://www.aipick.shop. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website.",
      },
      collect: {
        title: "Information We Collect",
        body: "We may automatically collect certain information when you visit our site, including your IP address, browser type, operating system, referring URLs, pages viewed, and dates/times of access. We may use cookies, web beacons, and similar technologies for analytics and advertising purposes.",
      },
      use: {
        title: "How We Use Your Information",
        body: "We use collected information to operate and maintain the website, improve user experience, analyze traffic and usage trends, deliver relevant content, and display advertisements through third-party partners such as Google.",
      },
      cookies: {
        title: "Advertising",
        body: "Third parties, including Google, may place and read cookies or use web beacons and IP addresses as a result of ad serving. See How Google uses information from sites or apps that use our services (https://policies.google.com/technologies/partner-sites). Opt out of personalized ads at Google Ads Settings (https://adssettings.google.com) or aboutads.info.",
      },
      thirdParty: {
        title: "Third-Party Services",
        body: "We may use third-party analytics and advertising services. These providers have their own privacy policies governing how they use your information. We encourage you to review their policies.",
      },
      rights: {
        title: "Your Rights",
        body: "Depending on your jurisdiction, you may have the right to access, correct, or delete your personal data. To exercise these rights, please submit your request through the Contact page on this website.",
      },
      contact: {
        title: "Contact Us",
        body: "If you have questions about this Privacy Policy, please reach out through the Contact page on this website.",
      },
    },
  },
} as const;

export default en;

export type Dictionary = typeof en;
