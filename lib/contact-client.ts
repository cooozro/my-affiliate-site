export const CONTACT_FORM_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "cooozro@gmail.com";

export const FORM_SUBMIT_ENDPOINT = `https://formsubmit.co/ajax/${encodeURIComponent(CONTACT_FORM_EMAIL)}`;
