/* Environmental Soil Science Lab — site interactions */
(function () {
  "use strict";

  /* ===== Shared: project folders + image probing =====================
     Photos live in images/<project>/ numbered 1,2,3,… (any common case/ext).
     We probe sequentially and stop at the first missing number. ================ */
  var PROJECT_FOLDERS = ["rice_ghg", "rice_et", "corn_n", "corn_cc", "nitrate", "methane", "organic", "sensing"];
  var IMG_EXTS = ["jpg", "jpeg", "png", "webp", "JPG", "JPEG", "PNG"];

  // Resolve one image base name across extensions: cb(url | null)
  function findImage(base, cb) {
    var k = 0;
    (function next() {
      if (k >= IMG_EXTS.length) return cb(null);
      var url = base + "." + IMG_EXTS[k++];
      var img = new Image();
      img.onload = function () { cb(url); };
      img.onerror = next;
      img.src = url;
    })();
  }

  // Probe a folder for photos numbered 1,2,3,…  Tolerates small gaps and mixed
  // capitalization; remembers the last working extension to stay fast. cb([urls])
  function probeFolder(folder, cb) {
    folder = (folder || "").replace(/\/+$/, "");
    var urls = [], MAX = 60, GAP = 4, lastExt = null;
    function tryNum(n, misses) {
      if (n > MAX || misses >= GAP) return cb(urls);
      var order = lastExt ? [lastExt].concat(IMG_EXTS.filter(function (e) { return e !== lastExt; })) : IMG_EXTS;
      var k = 0;
      (function tryExt() {
        if (k >= order.length) return tryNum(n + 1, misses + 1);   // this number is missing
        var ext = order[k++];
        var url = folder + "/" + n + "." + ext;
        var img = new Image();
        img.onload = function () { lastExt = ext; urls.push(url); tryNum(n + 1, 0); };
        img.onerror = tryExt;
        img.src = url;
      })();
    }
    tryNum(1, 0);
  }

  /* ---- Mobile navigation toggle ---- */
  var toggle = document.querySelector(".nav-toggle");
  var links = document.getElementById("nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { links.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
    });
  }

  /* ---- Research-highlight cards: fill each image with its project's first photo ---- */
  Array.prototype.forEach.call(document.querySelectorAll("img[data-first-from]"), function (img) {
    var folder = (img.getAttribute("data-first-from") || "").replace(/\/+$/, "");
    findImage(folder + "/1", function (url) { if (url) img.src = url; });
  });

  /* ---- Home hero slideshow: first photo of each project ---- */
  var hero = document.querySelector(".hero");
  if (hero) {
    var heroResults = new Array(PROJECT_FOLDERS.length), heroPending = PROJECT_FOLDERS.length;
    PROJECT_FOLDERS.forEach(function (f, idx) {
      findImage("images/" + f + "/1", function (url) {
        heroResults[idx] = url || null;
        if (--heroPending === 0) finishHero(hero, heroResults.filter(Boolean));
      });
    });
  }
  function finishHero(hero, urls) {
    if (!urls.length) return;
    var inner = hero.querySelector(".hero__inner");
    var frag = document.createDocumentFragment();
    urls.forEach(function (u, n) {
      var d = document.createElement("div");
      d.className = "hero__slide" + (n === 0 ? " is-active" : "");
      d.style.backgroundImage = 'url("' + u + '")';
      frag.appendChild(d);
    });
    hero.insertBefore(frag, inner || null);

    var slides = Array.prototype.slice.call(hero.querySelectorAll(".hero__slide"));
    var dotsWrap = hero.querySelector(".hero__dots");
    var i = 0, dots = [];
    if (slides.length > 1 && dotsWrap) {
      slides.forEach(function (_, n) {
        var b = document.createElement("button");
        b.type = "button"; b.setAttribute("aria-label", "Show slide " + (n + 1));
        if (n === 0) b.className = "is-active";
        b.addEventListener("click", function () { show(n); restart(); });
        dotsWrap.appendChild(b); dots.push(b);
      });
    }
    function show(n) {
      slides[i].classList.remove("is-active"); if (dots[i]) dots[i].classList.remove("is-active");
      i = (n + slides.length) % slides.length;
      slides[i].classList.add("is-active"); if (dots[i]) dots[i].classList.add("is-active");
    }
    var timer = null;
    function restart() { if (timer) clearInterval(timer); if (slides.length > 1) timer = setInterval(function () { show(i + 1); }, 5200); }
    restart();
  }

  /* ---- Lightbox for posters & gallery ---- */
  var lb = document.getElementById("lightbox");
  if (lb) {
    var lbImg = lb.querySelector("img");
    document.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("[data-full]") : null;
      if (t) { e.preventDefault(); lbImg.src = t.getAttribute("data-full"); lb.classList.add("open"); document.body.style.overflow = "hidden"; return; }
      if (e.target === lb || e.target === lbImg || (e.target.classList && e.target.classList.contains("lightbox__close"))) {
        lb.classList.remove("open"); lbImg.src = ""; document.body.style.overflow = "";
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lb.classList.contains("open")) { lb.classList.remove("open"); lbImg.src = ""; document.body.style.overflow = ""; }
    });
  }

  /* ---- Gallery: every photo from every project folder ---- */
  var galEl = document.querySelector(".gallery[data-auto-gallery]");
  if (galEl) {
    var galGroups = new Array(PROJECT_FOLDERS.length), galPending = PROJECT_FOLDERS.length;
    PROJECT_FOLDERS.forEach(function (f, idx) {
      probeFolder("images/" + f, function (urls) {
        galGroups[idx] = urls;
        if (--galPending === 0) finishGallery(galEl, galGroups);
      });
    });
  }
  function finishGallery(galEl, groups) {
    var frag = document.createDocumentFragment();
    groups.forEach(function (urls) {
      (urls || []).forEach(function (u) {
        var fig = document.createElement("figure");
        fig.setAttribute("data-full", u);
        var im = document.createElement("img");
        im.src = u; im.loading = "lazy"; im.alt = "Environmental Soil Science Lab photo";
        fig.appendChild(im);
        frag.appendChild(fig);
      });
    });
    galEl.appendChild(frag);
  }

  /* ---- Per-project photo slideshows (research page) ----
     Each .slideshow[data-folder] shows every photo in its folder, builds the
     arrows/dots/counter, stays hidden if the folder is empty, and autoplays
     only while scrolled into view. ---- */
  function initProjectSlideshow(ss) {
    var slides = Array.prototype.slice.call(ss.querySelectorAll(".ss-slide"));
    if (slides.length < 2) return;
    var dotsWrap = ss.querySelector(".ss-dots");
    var count = ss.querySelector(".ss-count");
    var i = 0, dots = [], timer = null;
    slides.forEach(function (_, n) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("aria-label", "Photo " + (n + 1));
      if (n === 0) b.className = "is-active";
      b.addEventListener("click", function () { go(n); restart(); });
      dotsWrap.appendChild(b); dots.push(b);
    });
    function upd() {
      slides.forEach(function (s, n) { s.classList.toggle("is-active", n === i); });
      dots.forEach(function (d, n) { d.classList.toggle("is-active", n === i); });
      if (count) count.textContent = (i + 1) + " / " + slides.length;
    }
    function go(n) { i = (n + slides.length) % slides.length; upd(); }
    ss.querySelector(".ss-prev").addEventListener("click", function () { go(i - 1); restart(); });
    ss.querySelector(".ss-next").addEventListener("click", function () { go(i + 1); restart(); });
    function start() { if (!timer) timer = setInterval(function () { go(i + 1); }, 5500); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); start(); }
    upd();
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.isIntersecting ? start() : stop(); });
      }, { threshold: 0.4 }).observe(ss);
    } else { start(); }
  }

  function renderProjectSlides(ss, urls) {
    if (!urls.length) return;            // empty folder → stays hidden
    var altBase = ss.getAttribute("data-alt") || "Project photo";
    var track = document.createElement("div");
    track.className = "ss-track";
    urls.forEach(function (u, n) {
      var fig = document.createElement("figure");
      fig.className = "ss-slide" + (n === 0 ? " is-active" : "");
      var im = document.createElement("img");
      im.src = u; im.loading = "lazy";
      im.alt = altBase + ", photo " + (n + 1);
      fig.appendChild(im); track.appendChild(fig);
    });
    ss.appendChild(track);
    ss.hidden = false;
    if (urls.length < 2) return;         // single photo → no controls
    [["ss-prev", "Previous photo", "\u2039"], ["ss-next", "Next photo", "\u203a"]].forEach(function (a) {
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "ss-arrow " + a[0];
      btn.setAttribute("aria-label", a[1]); btn.innerHTML = a[2];
      ss.appendChild(btn);
    });
    var dots = document.createElement("div"); dots.className = "ss-dots"; ss.appendChild(dots);
    var count = document.createElement("span"); count.className = "ss-count"; ss.appendChild(count);
    initProjectSlideshow(ss);
  }

  document.querySelectorAll("[data-slideshow]").forEach(function (ss) {
    if (ss.hasAttribute("data-folder")) probeFolder(ss.getAttribute("data-folder"), function (urls) { renderProjectSlides(ss, urls); });
    else initProjectSlideshow(ss);       // legacy static markup, if any
  });

})();
