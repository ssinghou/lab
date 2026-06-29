/* Environmental Soil Science Lab — site interactions */
(function () {
  "use strict";

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

  /* ---- Hero slideshow (auto-advance, no hover pause) ---- */
  var hero = document.querySelector(".hero");
  if (hero) {
    var slides = Array.prototype.slice.call(hero.querySelectorAll(".hero__slide"));
    var dotsWrap = hero.querySelector(".hero__dots");
    var capEl = hero.querySelector(".hero__cap");
    var caps = slides.map(function (s) { return s.getAttribute("data-cap") || ""; });
    var i = 0, dots = [];
    if (slides.length > 1 && dotsWrap) {
      slides.forEach(function (_, n) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", "Show slide " + (n + 1));
        if (n === 0) b.className = "is-active";
        b.addEventListener("click", function () { show(n); restart(); });
        dotsWrap.appendChild(b); dots.push(b);
      });
    }
    function show(n) {
      slides[i].classList.remove("is-active"); if (dots[i]) dots[i].classList.remove("is-active");
      i = (n + slides.length) % slides.length;
      slides[i].classList.add("is-active"); if (dots[i]) dots[i].classList.add("is-active");
      if (capEl) capEl.textContent = caps[i];
    }
    var timer = null;
    function restart() { if (timer) clearInterval(timer); if (slides.length > 1) timer = setInterval(function () { show(i + 1); }, 5200); }
    if (capEl) capEl.textContent = caps[0];
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

  /* ---- Per-project photo slideshows ----
     Folder-driven: each .slideshow[data-folder] shows every image in its folder,
     whatever the filenames are. The file list comes from the GitHub API (see
     below), images are sorted by name, and the slideshow stays hidden if the
     folder has no images yet. Autoplays only while scrolled into view. */

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

  /* Ask GitHub once for the repo's whole file list (one request), then show
     whatever images live in each project folder — any filenames, any count.
     Result is cached briefly so repeat visits don't re-hit the API; a stale
     cache is reused if a later request is unavailable (e.g. rate-limited). */
  var IMG_RE = /\.(jpe?g|png|webp|gif|avif)$/i;
  var CACHE_KEY = "ess_photo_tree_v1";
  var CACHE_TTL = 30 * 60 * 1000;   // 30 minutes

  function repoInfo() {
    var owner = "ssinghou", repo = "lab", branch = "main";   // fallbacks
    try {
      if (/\.github\.io$/i.test(location.hostname)) {
        owner = location.hostname.split(".")[0] || owner;
        var seg = location.pathname.split("/").filter(Boolean)[0];
        if (seg) repo = seg;
      }
    } catch (e) {}
    return { owner: owner, repo: repo, branch: branch };
  }

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { return null; }
  }
  function writeCache(paths) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), paths: paths })); } catch (e) {}
  }

  function fetchTree(cb) {
    var r = repoInfo();
    var url = "https://api.github.com/repos/" + r.owner + "/" + r.repo +
              "/git/trees/" + r.branch + "?recursive=1";
    if (!window.fetch) return cb(null);
    fetch(url, { headers: { "Accept": "application/vnd.github+json" } })
      .then(function (res) { if (!res.ok) throw new Error("http"); return res.json(); })
      .then(function (d) {
        if (!d || !d.tree) return cb(null);
        cb(d.tree.filter(function (t) { return t.type === "blob"; })
                 .map(function (t) { return t.path; }));
      })
      .catch(function () { cb(null); });
  }

  function getTree(cb) {
    var cached = readCache();
    if (cached && cached.paths && (Date.now() - cached.t) < CACHE_TTL) { cb(cached.paths); return; }
    fetchTree(function (paths) {
      if (paths) { writeCache(paths); cb(paths); }
      else if (cached && cached.paths) { cb(cached.paths); }   // stale-on-error
      else cb(null);
    });
  }

  function applyFolders(paths) {
    document.querySelectorAll("[data-slideshow][data-folder]").forEach(function (ss) {
      var folder = (ss.getAttribute("data-folder") || "").replace(/\/+$/, "") + "/";
      var files = (paths || []).filter(function (p) {
        return p.indexOf(folder) === 0 &&            // inside this folder
               p.slice(folder.length).indexOf("/") === -1 &&   // not a sub-subfolder
               IMG_RE.test(p);                        // is an image
      }).sort(function (a, b) {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
      });
      renderProjectSlides(ss, files);   // repo paths == site-relative paths
    });
  }

  if (document.querySelector("[data-slideshow][data-folder]")) {
    getTree(function (paths) { applyFolders(paths); });
  }
  document.querySelectorAll("[data-slideshow]:not([data-folder])").forEach(initProjectSlideshow);

})();
