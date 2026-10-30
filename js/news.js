/*
 * organizationalEvents.html - dynamic news list
 * (getAllNewsWithPagination, images via getImageById)
 *
 * Infinite scroll: pehle page ki news load hoti hai, jaise hi user list ke neeche
 * (sentinel #newsMore) ke paas pahunchta hai agla page apne aap load hokar neeche append ho jata hai.
 * Purana numbered pagination hata diya gaya hai. Hardcoded sections ab HTML se hata diye gaye hain,
 * isliye saara content yahin se aata hai.
 *
 * Animation: pehle hardcoded sections par `wow fadeInRight` (delay 0.2s) laga tha,
 * vaisa hi API se aayi hui news cards par laga hai. WOW.js page load par sirf pehle se
 * maujood elements ko pakadta hai, isliye dynamic cards ke liye yahin IntersectionObserver
 * + animate.css keyframes (fadeInRight / fadeInLeft) use kiye gaye hain - card scroll mein aate hi animate hota hai.
 */
(function () {
  "use strict";

  var list = document.getElementById("newsList");
  if (!list) return;

  var esc = CmsUtils.escapeHtml;

  // Direction alternate hoti hai: news 1 right se, news 2 left se, news 3 right se ...
  var ANIM_DIRS = ["fadeInRight", "fadeInLeft"];
  var ANIM_DELAY = "0.2s";
  var REDUCED_MOTION =
    !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var HAS_IO = "IntersectionObserver" in window;
  var observer = null; // card animation observer
  var scrollObserver = null; // infinite scroll observer

  /* ---------- Infinite scroll state ---------- */
  var nextPage = 0; // agla page jo fetch karna hai
  var loading = false; // ek time par ek hi request
  var finished = false; // saare pages aa chuke
  var rendered = 0; // ab tak screen par kitne cards hain
  var requestId = 0; // reset ke baad purani request ka result ignore karne ke liye

  // Footer: loader / error / "end" message yahin dikhte hain, aur yahi scroll sentinel bhi hai
  var more = document.getElementById("newsMore");
  if (!more) {
    more = document.createElement("div");
    more.id = "newsMore";
    more.className = "news-more text-center";
    list.parentNode.insertBefore(more, list.nextSibling);
  }

  // News ki pehli valid image (media se). Na ho toh null.
  function coverOf(item) {
    var media = item.mediaFiles || [];
    for (var i = 0; i < media.length; i++) {
      var url = CmsApi.mediaUrl(media[i]);
      if (url) return url;
    }
    return null;
  }

  function stateWrap(inner) {
    return (
      '<div class="container-fluid blog bg-light py-4"><div class="container">' +
      '<div class="news-state text-center">' + inner + "</div></div></div>"
    );
  }

  /* ---------- Scroll animation (wow fadeInRight jaisa) ---------- */

  function stopAnimations() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function reveal(el) {
    el.style.visibility = "visible";
    if (REDUCED_MOTION) return;
    var name = el.getAttribute("data-anim") || ANIM_DIRS[0];
    el.style.animationName = name;
    el.style.animationDuration = "1s";
    el.style.animationDelay = el.getAttribute("data-anim-delay") || ANIM_DELAY;
    el.style.animationFillMode = "both";
    el.classList.add("animated", name);
  }

  // Sirf naye (abhi tak animate na hue) cards ko pakadta hai, purane cards ko nahi chhedta
  function animateCards() {
    var els = list.querySelectorAll(".news-anim:not([data-anim-init])");
    if (!els.length) return;

    Array.prototype.forEach.call(els, function (el) {
      el.setAttribute("data-anim-init", "1");
    });

    // Animation support nahi / user ne motion kam rakha hai: seedha dikha do
    if (REDUCED_MOTION || !HAS_IO) {
      Array.prototype.forEach.call(els, reveal);
      return;
    }

    if (!observer) {
      observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            reveal(entry.target);
            observer.unobserve(entry.target);
          });
        },
        // threshold 0: lambe card par bhi trigger ho (ratio ka intezaar nahi)
        { threshold: 0, rootMargin: "0px 0px -8% 0px" }
      );
    }

    Array.prototype.forEach.call(els, function (el) {
      el.style.visibility = "hidden"; // animation se pehle chhupa rahe (WOW bhi aisa hi karta hai)
      observer.observe(el);
    });
  }

  /* ---------- States ---------- */

  function showMessage(icon, title, text, withRetry) {
    stopAnimations();
    more.innerHTML = "";
    list.innerHTML = stateWrap(
      '<i class="fa ' + icon + ' fa-3x text-primary mb-3"></i>' +
        '<h4 class="mb-2">' + esc(title) + "</h4>" +
        '<p class="mb-3">' + esc(text) + "</p>" +
        (withRetry
          ? '<button type="button" class="btn btn-primary rounded-pill py-2 px-4" id="newsRetry">Try Again</button>'
          : "")
    );
    var retry = document.getElementById("newsRetry");
    if (retry) retry.addEventListener("click", reset);
  }

  function showLoading() {
    stopAnimations();
    more.innerHTML = "";
    list.innerHTML = stateWrap(
      '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>' +
        '<p class="mt-3 mb-0">Loading news...</p>'
    );
  }

  /* Footer states (cards ke neeche) */

  function footerLoading() {
    more.innerHTML =
      '<div class="news-more-state">' +
      '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>' +
      '<p class="mt-2 mb-0 small">Loading more news...</p></div>';
  }

  function footerError(message) {
    more.innerHTML =
      '<div class="news-more-state">' +
      '<p class="mb-2 text-danger">' + esc(message || "Unable to load more news.") + "</p>" +
      '<button type="button" class="btn btn-primary rounded-pill py-2 px-4" id="newsMoreRetry">Try Again</button></div>';
    var retry = document.getElementById("newsMoreRetry");
    if (retry) retry.addEventListener("click", function () { loadMore(); });
  }

  function footerEnd() {
    // Sirf tab "end" dikhao jab ek se zyada page load hue ho, warna faltu lagta hai
    more.innerHTML =
      rendered > 0 && nextPage > 1
        ? '<div class="news-end">' +
          '<span class="news-end-line"></span>' +
          '<span class="news-end-pill"><i class="fa fa-check-circle"></i> You\'re all caught up</span>' +
          '<span class="news-end-line"></span>' +
          "</div>"
        : "";
  }

  // IntersectionObserver na ho toh manual button
  function footerButton() {
    more.innerHTML =
      '<button type="button" class="btn btn-primary rounded-pill py-2 px-4" id="newsLoadMoreBtn">Load More</button>';
    var btn = document.getElementById("newsLoadMoreBtn");
    if (btn) btn.addEventListener("click", function () { loadMore(); });
  }

  /* ---------- Cards ---------- */

  // light = bg-light section, imageRight = image desktop par right side
  // index: list mein card ka number (0,1,2...) - animation direction isi se alternate hoti hai
  function cardHtml(item, light, imageRight, index) {
    var href = "newsDetail.html?id=" + encodeURIComponent(item.newsId);
    var image = coverOf(item);
    // var date = CmsUtils.formatDate(CmsUtils.blogDate(item));
    // var author = item.authorName || "";
    var summary = item.summary || CmsUtils.truncate(CmsUtils.stripHtml(item.content), 320);

    var imgCol = image
      ? '<div class="col-md-12 col-lg-5 ' + (imageRight ? "order-1 order-lg-2" : "order-1") + '">' +
        '<a href="' + href + '" aria-label="' + esc(item.title) + '">' +
        '<img src="' + esc(image) + '" alt="' + esc(item.title) + '" class="img-fluid w-100" loading="lazy" ' +
        "onerror=\"this.onerror=null;this.src='" + esc(CMS_CONFIG.PLACEHOLDER_IMAGE) + "'\" />" +
        "</a></div>"
      : "";

    // var meta =
    //   (date ? '<span class="me-3"><i class="fa fa-calendar text-primary me-2"></i>' + esc(date) + "</span>" : "") +
    //   (author ? '<span><i class="fa fa-user text-primary me-2"></i>' + esc(author) + "</span>" : "");

    var textCol =
      '<div class="col-md-12 ' + (image ? "col-lg-7" : "col-lg-12") + " p-4 hideScroll " +
      (image ? (imageRight ? "order-2 order-lg-1" : "order-2") : "") + '">' +
      '<p class="mb-2"><a href="' + href + '" class="news-title">' + esc(item.title) + "</a></p>" +
      // (meta ? '<p class="news-meta mb-3">' + meta + "</p>" : "") +
      '<p class="text-dark news-summary">' + esc(summary) + "</p>" +
      '<a class="btn btn-primary rounded-pill py-2 px-4 d-block mx-auto" style="width:140px;" href="' + href + '">View More</a>' +
      "</div>";

    // .news-anim = purane hardcoded cards ke `wow fadeInRight/fadeInLeft` ka dynamic version (animateCards() isse pakadta hai)
    return (
      '<div class="container-fluid blog' + (light ? " bg-light" : "") + ' py-4">' +
      '<div class="container py-4"><div class="row g-4 justify-content-center">' +
      '<div class="col-md-12 news-anim" data-anim="' + ANIM_DIRS[index % ANIM_DIRS.length] +
      '" data-anim-delay="' + ANIM_DELAY + '"><div class="row">' + imgCol + textCol + "</div></div>" +
      "</div></div></div>"
    );
  }

  /* ---------- Infinite scroll ---------- */

  // Sentinel ko dobara observe karte hain, taaki agar load ke baad bhi wo screen ke paas ho
  // (chhoti screen / kam cards) toh observer phir se fire ho aur agla page aa jaye.
  function rearm() {
    if (!scrollObserver || finished) return;
    scrollObserver.unobserve(more);
    scrollObserver.observe(more);
  }

  async function loadMore() {
    if (loading || finished) return;
    loading = true;
    var myRequest = requestId;
    var firstBatch = rendered === 0;

    if (!firstBatch) footerLoading();

    try {
      var data = (await CmsApi.getNewsPage(nextPage, CMS_CONFIG.NEWS_PAGE_SIZE)) || {};
      if (myRequest !== requestId) return; // beech mein reset ho gaya, ye result ignore

      var raw = data.content || [];
      var items = raw;
      if (CMS_CONFIG.ONLY_PUBLISHED) items = items.filter(CmsUtils.isPublished);

      var total = data.totalPages || 0;
      var currentPageNo = typeof data.pageNumber === "number" ? data.pageNumber : nextPage;
      nextPage = currentPageNo + 1;
      finished = !raw.length || data.lastPage === true || nextPage >= total;

      if (items.length) {
        if (firstBatch) list.innerHTML = ""; // loading spinner hatao
        var base = rendered;
        list.insertAdjacentHTML(
          "beforeend",
          items
            .map(function (item, i) {
              var idx = base + i;
              // Bg alternate hota hai (pehla card bg-light, upar ka intro section white hai)
              var light = idx % 2 === 0;
              return cardHtml(item, light, !light, idx);
            })
            .join("")
        );
        rendered += items.length;
        animateCards();
      }

      loading = false;

      if (finished) {
        if (!rendered) {
          showMessage("fa-newspaper", "No news yet", "New updates will appear here soon.", false);
        } else {
          footerEnd();
        }
        return;
      }

      // Is page ki saari news filter ho gayi (unpublished) toh seedha agla page lao
      if (!rendered || !items.length) {
        loadMore();
        return;
      }

      if (HAS_IO) {
        more.innerHTML = "";
        rearm();
      } else {
        footerButton();
      }
    } catch (err) {
      if (myRequest !== requestId) return;
      loading = false;
      if (!rendered) {
        showMessage("fa-exclamation-circle", "Unable to load news", err.message || "Please try again.", true);
      } else {
        footerError(err.message);
      }
    }
  }

  function reset() {
    requestId++;
    nextPage = 0;
    rendered = 0;
    loading = false;
    finished = false;
    showLoading();
    loadMore();
  }

  function init() {
    if (HAS_IO) {
      scrollObserver = new IntersectionObserver(
        function (entries) {
          if (entries.some(function (e) { return e.isIntersecting; })) loadMore();
        },
        // 400px pehle hi trigger, taaki user ko loader ka intezaar na karna pade
        { threshold: 0, rootMargin: "0px 0px 400px 0px" }
      );
      scrollObserver.observe(more);
    }
    reset();
  }

  init();
})();