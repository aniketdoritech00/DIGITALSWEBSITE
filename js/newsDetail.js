/*
 * newsDetail.html - single news page (getNewsById)
 * URL: newsDetail.html?id=<newsId>
 * Structure blogDetail.js jaisa: mediaFiles ka image slider (4 per view) + hover popup.
 */
(function () {
  "use strict";

  var root = document.getElementById("newsDetail");
  if (!root) return;

  var crumb = document.getElementById("crumbTitle");
  var esc = CmsUtils.escapeHtml;
  var LIST_URL = "organizationalEvents.html";

  function showMessage(icon, title, text, withRetry) {
    root.innerHTML =
      '<div class="blog-state text-center">' +
      '<i class="fa ' + icon + ' fa-3x text-primary mb-3"></i>' +
      '<h4 class="mb-2">' + esc(title) + "</h4>" +
      '<p class="mb-3">' + esc(text) + "</p>" +
      (withRetry
        ? '<button type="button" class="btn btn-primary rounded-pill py-2 px-4 me-2" id="newsRetry">Try Again</button>'
        : "") +
      '<a href="' + LIST_URL + '" class="btn btn-light rounded-pill py-2 px-4">Back to News</a>' +
      "</div>";
    var retry = document.getElementById("newsRetry");
    if (retry) retry.addEventListener("click", init);
  }

  function showLoading() {
    root.innerHTML =
      '<div class="blog-state text-center">' +
      '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>' +
      '<p class="mt-3 mb-0">Loading news...</p></div>';
  }

  function setMeta(selector, createAttrs, content) {
    var el = document.head.querySelector(selector);
    if (!el) {
      el = document.createElement("meta");
      Object.keys(createAttrs).forEach(function (k) {
        el.setAttribute(k, createAttrs[k]);
      });
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }

  function updateSeo(news, imageUrl) {
    var title = news.title + " | " + CMS_CONFIG.SITE_NAME;
    var desc = news.summary || CmsUtils.truncate(CmsUtils.stripHtml(news.content), 160);
    document.title = title;
    setMeta('meta[name="description"]', { name: "description" }, desc);
    setMeta('meta[property="og:title"]', { property: "og:title" }, title);
    setMeta('meta[property="og:description"]', { property: "og:description" }, desc);
    setMeta('meta[property="og:type"]', { property: "og:type" }, "article");
    if (imageUrl) {
      var abs = new URL(imageUrl, window.location.href).href;
      setMeta('meta[property="og:image"]', { property: "og:image" }, abs);
    }
  }

  function readingTime(html) {
    var words = CmsUtils.stripHtml(html).split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }

  /*
   * mediaFiles ki saari images ka slider (blogDetail jaisa):
   * - ek baar mein 4 images (chhoti width par 3 / 2); count window ki jagah slider ki apni width se nikalte hain
   * - Next/Prev par utni hi images aage/peeche (agla poora set)
   * - image par hover (touch par tap) karne par bada popup
   */
  var PER_VIEW = { desktop: 4, tablet: 3, mobile: 2 };

  function perViewFor(width) {
    return width >= 560 ? PER_VIEW.desktop : width >= 380 ? PER_VIEW.tablet : PER_VIEW.mobile;
  }

  function canHover() {
    return window.matchMedia ? window.matchMedia("(hover: hover)").matches : true;
  }

  function sliderHtml(images, alt) {
    if (!images.length) return "";

    var slides = images
      .map(function (u, i) {
        return (
          '<div class="blog-slide"><div class="blog-slide-inner">' +
          '<img src="' + esc(u) + '" data-full="' + esc(u) + '" class="blog-slide-img" alt="' + esc(alt) + " (" + (i + 1) + ')"' +
          (i < PER_VIEW.desktop ? "" : ' loading="lazy"') + " />" +
          "</div></div>"
        );
      })
      .join("");

    return (
      '<div class="blog-slider-wrap" id="newsSliderWrap">' +
      '<div class="blog-slider" id="newsSlider" aria-roledescription="carousel" aria-label="News images">' +
      '<button type="button" class="blog-slider-btn prev" id="newsPrev" aria-label="Previous images"><i class="fa fa-chevron-left"></i></button>' +
      '<div class="blog-slider-viewport"><div class="blog-slider-track" id="newsTrack">' + slides + "</div></div>" +
      '<button type="button" class="blog-slider-btn next" id="newsNext" aria-label="Next images"><i class="fa fa-chevron-right"></i></button>' +
      "</div>" +
      '<div class="blog-slider-info" id="newsSliderInfo" aria-live="polite"></div>' +
      "</div>"
    );
  }

  // Hover popup (ek hi element poore page ke liye, body mein) - blogDetail ke saath same id/class
  function getPop() {
    var pop = document.getElementById("blogImgPop");
    if (!pop) {
      pop = document.createElement("div");
      pop.id = "blogImgPop";
      pop.className = "blog-img-pop";
      pop.setAttribute("aria-hidden", "true");
      pop.innerHTML = '<img alt="" />';
      document.body.appendChild(pop);
    }
    return pop;
  }

  function hidePop() {
    var pop = document.getElementById("blogImgPop");
    if (pop) pop.classList.remove("show");
  }

  function showPop(img) {
    var pop = getPop();
    var pimg = pop.firstChild;
    pimg.src = img.getAttribute("data-full") || img.src;
    pimg.alt = img.alt;

    // Popup thumbnail ke center par khulta hai, viewport ke andar clamp hokar
    var r = img.getBoundingClientRect();
    var w = pop.offsetWidth;
    var h = pop.offsetHeight;
    var left = r.left + r.width / 2 - w / 2;
    var top = r.top + r.height / 2 - h / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - h - 8));
    pop.style.left = left + "px";
    pop.style.top = top + "px";
    pop.classList.add("show");
  }

  function slideImg(target) {
    return target && target.closest ? target.closest(".blog-slide-img") : null;
  }

  // Global listeners sirf ek baar (Try Again / re-render par duplicate na ho)
  var activeLayout = null;
  var globalsBound = false;

  function bindGlobals() {
    if (globalsBound) return;
    globalsBound = true;
    document.addEventListener("click", hidePop);
    window.addEventListener("scroll", hidePop, { passive: true });
    window.addEventListener("resize", function () {
      hidePop();
      if (activeLayout) activeLayout();
    });
  }

  function initSlider() {
    activeLayout = null;
    var wrap = document.getElementById("newsSliderWrap");
    if (!wrap) return;

    var slider = document.getElementById("newsSlider");
    var track = document.getElementById("newsTrack");
    var prev = document.getElementById("newsPrev");
    var next = document.getElementById("newsNext");
    var info = document.getElementById("newsSliderInfo");
    var idx = 0;
    var pv = 1;

    function layout() {
      var slides = track.children;
      var n = slides.length;
      if (!n) {
        hidePop();
        wrap.remove();
        activeLayout = null;
        return;
      }

      pv = Math.min(perViewFor(wrap.clientWidth || window.innerWidth), n);
      var max = Math.max(0, n - pv);
      idx = Math.min(idx, max);

      for (var i = 0; i < n; i++) {
        slides[i].style.flex = "0 0 " + 100 / pv + "%";
        slides[i].style.maxWidth = 100 / pv + "%";
      }
      track.style.transform = "translateX(-" + (idx * 100) / pv + "%)";

      prev.disabled = idx <= 0;
      next.disabled = idx >= max;
      slider.classList.toggle("is-static", max === 0);
      slider.classList.toggle("is-single", n === 1);
      info.textContent = max === 0 ? "" : "Showing " + (idx + 1) + "–" + Math.min(idx + pv, n) + " of " + n;
    }

    // dir: +1 = next, -1 = previous. Ek click par poora visible set (pv images) khisakta hai.
    function go(dir) {
      hidePop();
      var max = Math.max(0, track.children.length - pv);
      idx = Math.max(0, Math.min(max, idx + dir * pv));
      layout();
    }

    prev.addEventListener("click", function () {
      go(-1);
    });
    next.addEventListener("click", function () {
      go(1);
    });

    // Touch swipe
    var startX = null;
    slider.addEventListener(
      "touchstart",
      function (e) {
        startX = e.touches[0].clientX;
      },
      { passive: true }
    );
    slider.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    });

    // Hover popup (desktop) / tap popup (touch)
    track.addEventListener("mouseover", function (e) {
      var img = slideImg(e.target);
      if (img && canHover()) showPop(img);
    });
    track.addEventListener("mouseout", function (e) {
      if (slideImg(e.target) && canHover()) hidePop();
    });
    track.addEventListener("click", function (e) {
      var img = slideImg(e.target);
      if (img && !canHover()) {
        e.stopPropagation();
        showPop(img);
      }
    });

    // Broken image wali slide hata do
    Array.prototype.forEach.call(track.querySelectorAll("img"), function (img) {
      img.addEventListener("error", function () {
        var slide = img.closest(".blog-slide");
        if (slide) slide.remove();
        layout();
      });
    });

    activeLayout = layout;
    bindGlobals();
    layout();
  }

  function render(news) {
    var images = (news.mediaFiles || [])
      .map(function (m) {
        return CmsApi.mediaUrl(m);
      })
      .filter(Boolean);

    var cover = images.length ? images[0] : null; // sirf og:image ke liye

    var cats = (news.categories || [])
      .map(function (c) {
        return '<span class="badge bg-primary me-2">' + esc(c.categoryName) + "</span>";
      })
      .join("");

    var date = CmsUtils.formatDate(CmsUtils.blogDate(news));
    var mins = readingTime(news.content);

    root.innerHTML =
      '<article class="blog-detail-article">' +
      (cats ? '<div class="mb-3">' + cats + "</div>" : "") +
      '<h1 class="blog-detail-title mb-3">' + esc(news.title) + "</h1>" +
      '<div class="blog-detail-meta d-flex flex-wrap gap-4 mb-4 small">' +
      '<span><i class="fa fa-user text-primary me-2"></i>' + esc(news.authorName || "Digitals India") + "</span>" +
      (date ? '<span><i class="fa fa-calendar text-primary me-2"></i>' + esc(date) + "</span>" : "") +
      '<span><i class="fa fa-clock text-primary me-2"></i>' + mins + " min read</span>" +
      "</div>" +
      sliderHtml(images, news.title) +
      (news.summary ? '<p class="blog-detail-summary">' + esc(news.summary) + "</p>" : "") +
      '<div class="blog-body" id="newsBody"></div>' +
      '<div class="mt-5 pt-4 border-top">' +
      '<a href="' + LIST_URL + '" class="btn btn-primary rounded-pill py-2 px-4"><i class="fa fa-arrow-left me-2"></i>Back to News</a>' +
      "</div></article>";

    // Quill ka HTML content (sanitize hokar)
    document.getElementById("newsBody").innerHTML = CmsUtils.renderContent(news.content);

    initSlider();

    if (crumb) crumb.textContent = CmsUtils.truncate(news.title, 60);
    updateSeo(news, cover);
  }

  async function init() {
    hidePop();
    var id = new URLSearchParams(window.location.search).get("id");
    if (!id || !/^\d+$/.test(id)) {
      showMessage("fa-search", "News not found", "The link looks incomplete or incorrect.", false);
      return;
    }

    showLoading();
    try {
      var news = await CmsApi.getNewsById(id);
      if (!news || (CMS_CONFIG.ONLY_PUBLISHED && !CmsUtils.isPublished(news))) {
        showMessage("fa-search", "News not found", "This article is not available.", false);
        return;
      }
      render(news);
    } catch (err) {
      if (err.status === 404) {
        showMessage("fa-search", "News not found", "This article does not exist.", false);
      } else {
        showMessage("fa-exclamation-circle", "Unable to load news", err.message || "Please try again.", true);
      }
    }
  }

  init();
})();