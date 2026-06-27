const en = {
  meta: {
    siteDescription:
      "Data-driven tech reviews and buying guides for smartphones, gadgets, and consumer electronics.",
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
      "AI Pick & Report is an independent tech review publication dedicated to data-backed buying guides.",
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
      "Learn about AI Pick & Report — an independent IT review publication focused on data-backed product analysis.",
  },
  contact: {
    title: "Contact",
    metaDescription:
      "Get in touch with the AI Pick & Report editorial team for questions, corrections, or partnership inquiries.",
    intro:
      "We welcome reader feedback, product tips, and partnership inquiries. Please contact us only through the form below.",
    formNotice:
      "For privacy and a timely response, we do not accept inquiries by direct email. Please use this contact form.",
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
      "The contact form needs one-time email activation. Please check the inbox for cooozro@gmail.com (including spam) for a FormSubmit activation email and click the link. Then try again.",
    responseTime: "We typically respond within 2–3 business days.",
  },
  privacy: {
    title: "Privacy Policy",
    metaDescription:
      "Privacy Policy for AI Pick & Report — how we collect, use, and protect your information.",
    lastUpdated: "Last updated: June 25, 2026",
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
        body: "We partner with third-party advertising services to provide relevant content and ads. These partners may use cookies to serve ads based on your prior visits to our website or other websites across the internet. This practice adheres to Google's advertising policies and industry standards for transparency and user privacy. You may opt out of personalized advertising by visiting Google Ads Settings.",
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
        body: "If you have questions about this Privacy Policy, please reach out through the Contact page on this website. We do not accept privacy-related inquiries via direct email.",
      },
    },
  },
} as const;

export default en;

export type Dictionary = typeof en;
