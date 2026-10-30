/*
 * blog.html - blog listing (getAllBlogsWithPagination, images via getImageById)
 *
 * Infinite scroll: pehle page ke blogs load hote hain, jaise hi user list ke neeche
 * (sentinel #blogMore) ke paas pahunchta hai agla page apne aap load hokar neeche append ho jata hai.
 * Purana numbered pagination hata diya gaya hai.
 *
 * Animation: purane hardcoded cards par `wow fadeInUp` (delay 0.2s / 0.4s) laga tha.
 * WOW.js page load par sirf pehle se maujood elements ko pakadta hai, isliye API se aaye cards
 * ke liye yahin IntersectionObserver + animate.css keyframes (fadeInUp) use hote hain -
 * card scroll mein aate hi animate hota hai. Left column wala card 0.2s, right column wala 0.4s delay se.
 */
(function () {
  "use strict";

  var list = document.getElementById("blogList");
  if (!list) return;

  var esc = CmsUtils.escapeHtml;

  // Purane cards jaisi hi animation (HTML mein: wow fadeInUp, data-wow-delay 0.2s / 0.4s)
  var ANIM_NAME = "fadeInUp";
  var ANIM_DELAYS = ["0.2s", "0.4s"]; // 2-column grid: left card 0.2s, right card 0.4s
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
  var more = document.getElementById("blogMore");
  if (!more) {
    more = document.createElement("div");
    more.id = "blogMore";
    more.className = "blog-more text-center mt-5";
    list.parentNode.insertBefore(more, list.nextSibling);
  }

  /* ---------- Scroll animation (wow fadeInUp jaisa) ---------- */

  function stopAnimations() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function reveal(el) {
    el.style.visibility = "visible";
    if (REDUCED_MOTION) return;
    el.style.animationName = ANIM_NAME;
    el.style.animationDuration = "1s";
    el.style.animationDelay = el.getAttribute("data-anim-delay") || ANIM_DELAYS[0];
    el.style.animationFillMode = "both";
    el.classList.add("animated", ANIM_NAME);
  }

  // Sirf naye (abhi tak animate na hue) cards ko pakadta hai, purane cards ko nahi chhedta
  function animateCards() {
    var els = list.querySelectorAll(".blog-anim:not([data-anim-init])");
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
    list.innerHTML =
      '<div class="col-12"><div class="blog-state text-center">' +
      '<i class="fa ' + icon + ' fa-3x text-primary mb-3"></i>' +
      '<h4 class="mb-2">' + esc(title) + "</h4>" +
      '<p class="mb-3">' + esc(text) + "</p>" +
      (withRetry
        ? '<button type="button" class="btn btn-primary rounded-pill py-2 px-4" id="blogRetry">Try Again</button>'
        : "") +
      "</div></div>";
    var retry = document.getElementById("blogRetry");
    if (retry) retry.addEventListener("click", reset);
  }

  function showLoading() {
    stopAnimations();
    more.innerHTML = "";
    list.innerHTML =
      '<div class="col-12"><div class="blog-state text-center">' +
      '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>' +
      '<p class="mt-3 mb-0">Loading blogs...</p></div></div>';
  }

  /* Footer states (cards ke neeche) */

  function footerLoading() {
    more.innerHTML =
      '<div class="blog-more-state">' +
      '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>' +
      '<p class="mt-2 mb-0 small">Loading more blogs...</p></div>';
  }

  function footerError(message) {
    more.innerHTML =
      '<div class="blog-more-state">' +
      '<p class="mb-2 text-danger">' + esc(message || "Unable to load more blogs.") + "</p>" +
      '<button type="button" class="btn btn-primary rounded-pill py-2 px-4" id="blogMoreRetry">Try Again</button></div>';
    var retry = document.getElementById("blogMoreRetry");
    if (retry) retry.addEventListener("click", function () { loadMore(); });
  }

  function footerEnd() {
  // Sirf tab "end" dikhao jab ek se zyada page load hue ho, warna faltu lagta hai
  more.innerHTML =
    rendered > 0 && nextPage > 1
      ? '<div class="blog-end">' +
        '<span class="blog-end-line"></span>' +
        '<span class="blog-end-pill"><i class="fa fa-check-circle"></i> You\'re all caught up</span>' +
        '<span class="blog-end-line"></span>' +
        "</div>"
      : "";
}

  // IntersectionObserver na ho toh manual button
  function footerButton() {
    more.innerHTML =
      '<button type="button" class="btn btn-primary rounded-pill py-2 px-4" id="blogLoadMoreBtn">Load More</button>';
    var btn = document.getElementById("blogLoadMoreBtn");
    if (btn) btn.addEventListener("click", function () { loadMore(); });
  }

  /* ---------- Cards ---------- */

  // index: list mein card ka number (0,1,2...) - delay isi se alternate hota hai (0.2s / 0.4s)
  function cardHtml(blog, index) {
    var href = "blogDetail.html?id=" + encodeURIComponent(blog.blogId);
    var image = CmsUtils.pickImage(blog);
    var category = blog.categories && blog.categories.length ? blog.categories[0].categoryName : "Blog";
    // var author = blog.authorName || "Digitals India";
    // var date = CmsUtils.formatDate(CmsUtils.blogDate(blog));
    var summary = blog.summary || CmsUtils.truncate(CmsUtils.stripHtml(blog.content), 220);

    // .blog-anim = purane cards ke `wow fadeInUp` ka dynamic version (animateCards() isse pakadta hai)
    return (
      '<div class="col-lg-6 col-xl-6 blog-anim" data-anim-delay="' + ANIM_DELAYS[index % ANIM_DELAYS.length] + '">' +
      '<div class="blog-item h-100 d-flex flex-column">' +
      '<div class="blog-img">' +
      '<a href="' + href + '" aria-label="' + esc(blog.title) + '">' +
      '<img src="' + esc(image) + '" class="img-fluid rounded-top w-100 blog-thumb" alt="' + esc(blog.title) + '" loading="lazy" ' +
      "onerror=\"this.onerror=null;this.src='" + esc(CMS_CONFIG.PLACEHOLDER_IMAGE) + "'\" />" +
      "</a>" +
      '<div class="blog-categiry py-2 px-4"><span>' + esc(category) + "</span></div>" +
      "</div>" +
      '<div class="blog-content p-4 d-flex flex-column flex-grow-1">' +
      // '<div class="blog-comment d-flex justify-content-between mb-3">' +
      // '<div class="small"><span class="fa fa-user text-primary"></span> ' + esc(author) + "</div>" +
      // (date ? '<div class="small"><span class="fa fa-calendar text-primary"></span> ' + esc(date) + "</div>" : "") +
      // "</div>" +
      '<a href="' + href + '" class="h4 d-inline-block mb-3">' + esc(blog.title) + "</a>" +
      '<p class="mb-3 flex-grow-1 blog-summary">' + esc(summary) + "</p>" +
      '<a href="' + href + '" class="btn p-0 mt-auto align-self-start">Read More <i class="fa fa-arrow-right"></i></a>' +
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
      var data = (await CmsApi.getBlogsPage(nextPage, CMS_CONFIG.PAGE_SIZE)) || {};
      if (myRequest !== requestId) return; // beech mein reset ho gaya, ye result ignore

      var raw = data.content || [];
      var blogs = raw;
      if (CMS_CONFIG.ONLY_PUBLISHED) blogs = blogs.filter(CmsUtils.isPublished);

      var total = data.totalPages || 0;
      var currentPageNo = typeof data.pageNumber === "number" ? data.pageNumber : nextPage;
      nextPage = currentPageNo + 1;
      finished = !raw.length || data.lastPage === true || nextPage >= total;

      if (blogs.length) {
        if (firstBatch) list.innerHTML = ""; // loading spinner hatao
        var base = rendered;
        list.insertAdjacentHTML(
          "beforeend",
          blogs.map(function (b, i) { return cardHtml(b, base + i); }).join("")
        );
        rendered += blogs.length;
        animateCards();
      }

      loading = false;

      if (finished) {
        if (!rendered) {
          showMessage("fa-newspaper", "No blogs yet", "New stories will appear here soon.", false);
        } else {
          footerEnd();
        }
        return;
      }

      // Is page ke saare blogs filter ho gaye (unpublished) toh seedha agla page lao
      if (!rendered || !blogs.length) {
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
        showMessage("fa-exclamation-circle", "Unable to load blogs", err.message || "Please try again.", true);
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