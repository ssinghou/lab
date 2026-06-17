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

  /* ---- Per-project photo slideshows (multiple, autoplay only while visible) ---- */
  document.querySelectorAll("[data-slideshow]").forEach(function (ss) {
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
  });

})();
