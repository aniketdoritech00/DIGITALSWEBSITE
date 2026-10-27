/*
 * CMS API layer (public GET calls, no token).
 * Exposes: window.CmsApi
 */
(function (w) {
  "use strict";

  var cfg = w.CMS_CONFIG;

  // Public (no token) endpoints
  var PUBLIC = "/publicNewsBlog";

  // Backend response shape: { message, payload, status }
  async function request(path) {
    var res;
    try {
      res = await fetch(cfg.API_BASE_URL + path, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
    } catch (e) {
      var netErr = new Error("Unable to reach the server. Please try again later.");
      netErr.network = true;
      throw netErr;
    }

    var body = null;
    try {
      body = await res.json();
    } catch (e) {
      /* non-JSON response */
    }

    var status = (body && body.status) || res.status;
    if (!res.ok || status >= 400) {
      var err = new Error((body && body.message) || "Request failed (" + res.status + ")");
      err.status = status;
      throw err;
    }
    return body ? body.payload : null;
  }

  /* ---------- Blogs ---------- */
  // payload: { content: [...], pageNumber, pageSize, totalElements, totalPages, lastPage }
  function getBlogsPage(page, size) {
    return request(
      PUBLIC + "/getAllBlogsWithPagination?page=" + encodeURIComponent(page) + "&size=" + encodeURIComponent(size)
    );
  }

  function getBlogById(id) {
    return request(PUBLIC + "/getBlogById/" + encodeURIComponent(id));
  }

  /* ---------- News ---------- */
  // payload: { content: [...], pageNumber, pageSize, totalElements, totalPages, lastPage }
  function getNewsPage(page, size) {
    return request(
      PUBLIC + "/getAllNewsWithPagination?page=" + encodeURIComponent(page) + "&size=" + encodeURIComponent(size)
    );
  }

  function getNewsById(id) {
    return request(PUBLIC + "/getNewsById/" + encodeURIComponent(id));
  }

  /* ---------- Image ---------- */
  // getImageById seedha image bytes deta hai, isliye <img src> mein direct use hota hai.
  function imageUrl(mediaId) {
    return cfg.API_BASE_URL + PUBLIC + "/getImageById/" + encodeURIComponent(mediaId);
  }

  // Media object se displayable image URL banata hai (ya null).
  function mediaUrl(m) {
    if (!m || m.mediaId === null || m.mediaId === undefined) return null;
    if (m.contentType && m.contentType.indexOf("image/") !== 0) return null;
    return imageUrl(m.mediaId);
  }

  w.CmsApi = {
    getBlogsPage: getBlogsPage,
    getBlogById: getBlogById,
    getNewsPage: getNewsPage,
    getNewsById: getNewsById,
    imageUrl: imageUrl,
    mediaUrl: mediaUrl,
  };
})(window);