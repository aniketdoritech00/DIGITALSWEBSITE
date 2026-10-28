/*
 * CMS configuration for blog pages.
 * Live par jaate waqt sirf API_BASE_URL badalna hai.
 */
window.CMS_CONFIG = {
  // Backend base URL (live: e.g. "https://api.digitalsindia.com/api/cms")
  API_BASE_URL: "http://103.205.65.27:8002/CMS/api/cms",

  // Blog listing mein ek page par kitne blogs aayenge
  PAGE_SIZE: 10,

  // organizationalEvents.html (news) mein ek page par kitni news aayengi
  NEWS_PAGE_SIZE: 10,

  // true  = sirf PUBLISHED blogs website par dikhenge
  // false = DRAFT bhi dikhenge (testing ke time useful)
  ONLY_PUBLISHED: true,

  // Image na mile ya load fail ho toh ye dikhegi
  PLACEHOLDER_IMAGE: "img/blog-1.png",

  SITE_NAME: "Digitals India Security Pvt. Ltd.",
};