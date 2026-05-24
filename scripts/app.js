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
  // Two responsibilities:
  //   a) Track which card is "active" (most centered in the scroll
  //      container) so we can disable the arrow that has nowhere to
  //      point. CSS hides disabled arrows entirely — see session.css
  //      .cards-arrow:disabled { display: none } — so the user only
  //      sees the affordance when it's actionable.
  //   b) On arrow click, scrollTo the *exact* snap target for the
  //      target card. Earlier we used scrollBy(stepSize), but that
  //      hits the max-scrollLeft ceiling before reaching card 3's
  //      end-aligned snap, so navigation to the last card broke.
  //      Computing the snap target from offsetLeft + alignment gives
  //      a deterministic destination on every click.
  var cardsEl = document.querySelector(".cards");
  var prevArrow = document.querySelector(".cards-arrow--prev");
  var nextArrow = document.querySelector(".cards-arrow--next");
  if (cardsEl && prevArrow && nextArrow) {
    var cardsArr = Array.prototype.slice.call(cardsEl.querySelectorAll(".card"));
    var lastIndex = cardsArr.length - 1;
    var activeIndex = 0;

    var syncArrows = function () {
      prevArrow.disabled = activeIndex <= 0;
      nextArrow.disabled = activeIndex >= lastIndex;
    };

    // Compute the exact scrollLeft that would put the target card at
    // its CSS-defined snap position. Reading the live computed style
    // means card 1 (start), card N (end), and middle cards (center)
    // each resolve to their own anchor.
    var snapTargetFor = function (index) {
      var card = cardsArr[index];
      if (!card) return 0;
      var cs = getComputedStyle(cardsEl);
      var padStart = parseFloat(cs.scrollPaddingInlineStart) || 0;
      var padEnd = parseFloat(cs.scrollPaddingInlineEnd) || 0;
      var clientW = cardsEl.clientWidth;
      if (index === 0) return card.offsetLeft - padStart;
      if (index === lastIndex) {
        return card.offsetLeft + card.offsetWidth - (clientW - padEnd);
      }
      return card.offsetLeft - (clientW - card.offsetWidth) / 2;
    };

    var goTo = function (index) {
      if (index < 0) index = 0;
      else if (index > lastIndex) index = lastIndex;
      if (index === activeIndex) return;
      // Mandatory scroll-snap will yank the smooth scrollTo back to the
      // current snap point mid-animation on iOS WebKit. Temporarily
      // relax to "none" so the programmatic scroll lands on the new
      // snap target, then restore mandatory so swipes still snap.
      cardsEl.style.scrollSnapType = "none";
      cardsEl.scrollTo({ left: snapTargetFor(index), behavior: "smooth" });
      window.clearTimeout(goTo._snapRestore);
      goTo._snapRestore = window.setTimeout(function () {
        cardsEl.style.scrollSnapType = "";
      }, 700);
      // No optimistic activeIndex change — the observers below are the
      // single source of truth so the arrows can't lie about state if
      // the scroll fails to land.
    };

    prevArrow.addEventListener("click", function () { goTo(activeIndex - 1); });
    nextArrow.addEventListener("click", function () { goTo(activeIndex + 1); });

    var setActive = function (idx) {
      if (idx !== activeIndex) {
        activeIndex = idx;
        syncArrows();
      }
    };

    // IntersectionObserver — fires when a card crosses ~55% visibility.
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.intersectionRatio > 0.55) {
          var idx = cardsArr.indexOf(entry.target);
          if (idx !== -1) setActive(idx);
        }
      });
    }, { root: cardsEl, threshold: [0.55, 0.8] });
    cardsArr.forEach(function (card) { io.observe(card); });

    // Belt-and-suspenders scroll listener: in iOS WebKit the IO root=
    // scrollable-element path can miss intermediate states during fast
    // scroll. Finding the card whose center is closest to the scrollport
    // center is robust to that.
    var scrollRAF = null;
    cardsEl.addEventListener("scroll", function () {
      if (scrollRAF) return;
      scrollRAF = requestAnimationFrame(function () {
        scrollRAF = null;
        var rect = cardsEl.getBoundingClientRect();
        var portCenter = (rect.left + rect.right) / 2;
        var best = 0;
        var bestDist = Infinity;
        cardsArr.forEach(function (card, i) {
          var r = card.getBoundingClientRect();
          var c = (r.left + r.right) / 2;
          var d = Math.abs(c - portCenter);
          if (d < bestDist) { bestDist = d; best = i; }
        });
        setActive(best);
      });
    }, { passive: true });

    // Initial state: card 1 active, arrows synced. Reset scrollLeft in
    // case the browser restored a non-zero position from history.
    cardsEl.scrollLeft = 0;
    activeIndex = 0;
    syncArrows();
  }
})();
