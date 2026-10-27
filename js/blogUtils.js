/*
 * Helpers shared by blog listing + blog detail.
 * Exposes: window.CmsUtils
 */
(function (w) {
  "use strict";

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // "2026-10-22T13:59:23.0501312" -> "22 Oct 2026"
  function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(String(iso).replace(/(\.\d{3})\d+/, "$1"));
    if (isNaN(d.getTime())) return "";
    return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  }

  function parseHtml(html) {
    return new DOMParser().parseFromString(String(html || ""), "text/html");
  }

  function stripHtml(html) {
    var text = parseHtml(html).body.textContent || "";
    return text.replace(/\s+/g, " ").trim();
  }

  function truncate(text, max) {
    if (text.length <= max) return text;
    return text.slice(0, max).replace(/\s+\S*$/, "") + "\u2026";
  }

  function firstImageFromHtml(html) {
    var img = parseHtml(html).querySelector("img");
    return img ? img.getAttribute("src") : null;
  }

  function isPublished(blog) {
    return String(blog && blog.status).toUpperCase() === "PUBLISHED";
  }

  function blogDate(blog) {
    return blog.publishedAt || blog.createdAt;
  }

  // Blog ki cover image: media -> content ki pehli image -> placeholder
  function pickImage(blog) {
    var list = blog.mediaFiles || [];
    for (var i = 0; i < list.length; i++) {
      var url = w.CmsApi.mediaUrl(list[i]);
      if (url) return url;
    }
    return firstImageFromHtml(blog.content) || w.CMS_CONFIG.PLACEHOLDER_IMAGE;
  }

  /*
   * React-Quill ka HTML content safe tarike se page me daalne ke liye.
   * DOMPurify script/event handlers hata deta hai. Iframe sirf YouTube/Vimeo ka.
   */
  function sanitizeHtml(dirty) {
    if (!w.DOMPurify) return null;
    var clean = w.DOMPurify.sanitize(dirty, {
      ADD_TAGS: ["iframe"],
      ADD_ATTR: ["allowfullscreen", "frameborder"],
    });
    var tpl = document.createElement("template");
    tpl.innerHTML = clean;

    tpl.content.querySelectorAll("iframe").forEach(function (f) {
      var src = f.getAttribute("src") || "";
      if (!/^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com)\//i.test(src)) {
        f.remove();
      }
    });
    tpl.content.querySelectorAll("a[href]").forEach(function (a) {
      if (/^https?:/i.test(a.getAttribute("href"))) {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      }
    });
    return tpl.innerHTML;
  }

  // Content HTML (Quill) ho ya purana plain text, dono handle hote hain.
  function renderContent(content) {
    var raw = String(content || "");
    var looksHtml = /<\/?[a-z][\s\S]*?>/i.test(raw);
    var html = looksHtml
      ? raw
      : raw
          .split(/\n{2,}/)
          .map(function (p) {
            return "<p>" + escapeHtml(p).replace(/\n/g, "<br>") + "</p>";
          })
          .join("");

    var clean = sanitizeHtml(html);
    if (clean !== null) return clean;
    // DOMPurify load nahi hua toh formatting ke bina safe text dikhao
    return "<p>" + escapeHtml(stripHtml(raw)) + "</p>";
  }

  w.CmsUtils = {
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    stripHtml: stripHtml,
    truncate: truncate,
    isPublished: isPublished,
    blogDate: blogDate,
    pickImage: pickImage,
    renderContent: renderContent,
  };
})(window);