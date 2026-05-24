/* ============================================================
   app.js
   Two responsibilities:

   1) Lock page scroll while the intro is animating, then release.
      The intro layer rolls up at t=4.3s (see sections/intro.css),
      so the document is unfrozen at t=5.4s — half a second of
      buffer for the animation easing tail.

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
  }, 5400);

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
})();
