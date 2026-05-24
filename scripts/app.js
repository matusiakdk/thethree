/* ============================================================
   app.js
   Two responsibilities:

   1) Lock page scroll while the intro is animating, then release.
      The intro layer rolls up at t=3.7s (see sections/intro.css),
      so the document is unfrozen at t=4.8s — 100 ms past the end
      of the 1 s roll-up animation.

   2) Toggle reveal classes on sections as they scroll into view.
      Each section's CSS gates its animations behind a `.revealed`
      modifier added here; nothing animates until then.

   The hero is special: its `wl-revealed` class is added either on
   first scroll intent (wheel/touch/scroll) or after a 10.4s timer,
   whichever comes first. Scroll listeners attach at t=6.5s so
   they don't catch the intro's own programmatic motion.
   ============================================================ */

(function () {
  // ---------- 1. Intro scroll lock ----------
  document.documentElement.style.overflow = "hidden";
  setTimeout(function () {
    document.documentElement.style.overflow = "";
  }, 4800);

  // ---------- 2. Section reveals via IntersectionObserver ----------
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("revealed");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });

  // Each section's reveal target is whichever element its CSS
  // hangs the `.revealed` modifier on.
  [
    ".cards",        // session screen — cards row
    ".how-steps",    // how it works — steps column
    ".screen--who",  // who it's for — whole section
    ".screen--why",  // why the three — whole section
    ".screen--cta"   // closing cta — whole section
  ].forEach(function (sel) {
    var el = document.querySelector(sel);
    if (el) io.observe(el);
  });

  // ---------- 3. Hero waitlist reveal ----------
  // Fires once: either on first scroll intent or after the timer.
  var screen1 = document.querySelector(".screen--1");
  var wlRevealed = false;
  function revealWaitlist() {
    if (wlRevealed || !screen1) return;
    wlRevealed = true;
    screen1.classList.add("wl-revealed");
  }
  setTimeout(revealWaitlist, 10400);
  setTimeout(function () {
    window.addEventListener("wheel", revealWaitlist, { once: true, passive: true });
    window.addEventListener("touchmove", revealWaitlist, { once: true, passive: true });
    window.addEventListener("scroll", revealWaitlist, { once: true, passive: true });
  }, 6500);

  // ---------- 4. Session-cards carousel arrows ----------
  // The .cards-arrow buttons exist in the DOM but are only displayed
  // when the carousel is active and the device has a mouse (see the
  // media query in styles/responsive.css). When visible they scroll
  // the .cards row by exactly one card + gap each click, with the
  // disabled state updated whenever scroll position changes.
  var cardsEl = document.querySelector(".cards");
  var prevArrow = document.querySelector(".cards-arrow--prev");
  var nextArrow = document.querySelector(".cards-arrow--next");
  if (cardsEl && prevArrow && nextArrow) {
    // Safety net: even with scroll-snap-align:start, some browsers
    // may restore scroll position from history on reload. Force the
    // carousel to land on Aisha (first card) every time.
    cardsEl.scrollLeft = 0;
    var stepSize = function () {
      var firstCard = cardsEl.querySelector(".card");
      if (!firstCard) return 0;
      var gap = parseFloat(getComputedStyle(cardsEl).gap) || 0;
      return firstCard.offsetWidth + gap;
    };
    prevArrow.addEventListener("click", function () {
      cardsEl.scrollBy({ left: -stepSize(), behavior: "smooth" });
    });
    nextArrow.addEventListener("click", function () {
      cardsEl.scrollBy({ left: stepSize(), behavior: "smooth" });
    });
    var updateArrowState = function () {
      var max = cardsEl.scrollWidth - cardsEl.clientWidth - 1;
      prevArrow.disabled = cardsEl.scrollLeft <= 1;
      nextArrow.disabled = cardsEl.scrollLeft >= max;
    };
    cardsEl.addEventListener("scroll", updateArrowState, { passive: true });
    window.addEventListener("resize", updateArrowState);
    updateArrowState();
  }
})();
