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
  // Respect OS-level "Reduce motion" setting. When on, we skip the
  // intro splash entirely (the .intro element is display:none via the
  // matching CSS media query). With nothing covering the page, the
  // scroll lock and timer-based reveals would only get in the way —
  // so bypass them and put the page in its "after-intro" state on load.
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- 1. Intro scroll lock ----------
  if (!reduceMotion) {
    document.documentElement.style.overflow = "hidden";
    setTimeout(function () {
      document.documentElement.style.overflow = "";
    }, 4800);
  }

  // ---------- 2. Section reveals via IntersectionObserver ----------
  // Named `revealIO` (not `io`) to avoid clashing with the carousel
  // IntersectionObserver further down. Both used to be `var io` in
  // the same IIFE scope — the second declaration silently rebound the
  // name, so this callback's io.unobserve() targeted the wrong observer
  // and the section observer never released its entries.
  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("revealed");
        revealIO.unobserve(e.target);
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
    if (el) revealIO.observe(el);
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
  if (reduceMotion) {
    // No intro animation to wait on — make the waitlist visible right away.
    revealWaitlist();
  } else {
    setTimeout(revealWaitlist, 10400);
    setTimeout(function () {
      window.addEventListener("wheel", revealWaitlist, { once: true, passive: true });
      window.addEventListener("touchmove", revealWaitlist, { once: true, passive: true });
      window.addEventListener("scroll", revealWaitlist, { once: true, passive: true });
    }, 6500);
  }

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
    // its CSS-defined snap position. card.offsetLeft is measured from
    // the nearest positioned ancestor (.cards-rail in our markup), NOT
    // from the scroll container (.cards) — and because .cards has
    // margin-inline:-6vw, the two are offset by 6vw. Using offsetLeft
    // directly produced snap targets that were 6vw short of the actual
    // CSS snap points, so scrollTo would scroll close-but-not-correct
    // and the restored mandatory-snap would yank back to the original
    // card. getBoundingClientRect + scrollLeft is offsetParent-blind
    // and always gives the card's position inside the scrollable area.
    var snapTargetFor = function (index) {
      var card = cardsArr[index];
      if (!card) return 0;
      var cs = getComputedStyle(cardsEl);
      var padStart = parseFloat(cs.scrollPaddingInlineStart) || parseFloat(cs.paddingLeft) || 0;
      var padEnd = parseFloat(cs.scrollPaddingInlineEnd) || parseFloat(cs.paddingRight) || 0;
      var clientW = cardsEl.clientWidth;
      var containerRect = cardsEl.getBoundingClientRect();
      var cardRect = card.getBoundingClientRect();
      var cardLeftInScroll = cardRect.left - containerRect.left + cardsEl.scrollLeft;
      var cardWidth = cardRect.width;
      if (index === 0) return cardLeftInScroll - padStart;
      if (index === lastIndex) {
        return cardLeftInScroll + cardWidth - (clientW - padEnd);
      }
      return cardLeftInScroll - (clientW - cardWidth) / 2;
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

    // Whether .cards is currently in horizontal-carousel mode. On desktop
    // (>760px) the row is `display:flex; justify-content:center;` with no
    // overflow — all 3 cards are simultaneously "visible" inside the
    // container, so the IO below would report all of them as active and
    // wedge activeIndex at the last one iterated (card 2 / Anna). When
    // the user then narrows their window below 760px, the carousel
    // takes over with scrollLeft=0 (Aisha visible) but activeIndex still
    // says 2 — so PREV shows as available, clicking PREV runs goTo(1)
    // and the view jumps to Stefan instead of staying on Aisha. Gating
    // setActive on real scrollability is the single source of truth.
    var isCarousel = function () {
      return cardsEl.scrollWidth > cardsEl.clientWidth;
    };

    var setActive = function (idx) {
      if (!isCarousel()) return;
      if (idx !== activeIndex) {
        activeIndex = idx;
        syncArrows();
      }
    };

    // Pick the card whose center is closest to the scrollport center.
    // Shared by the scroll listener (during a swipe / arrow-driven
    // smooth scroll) and the resize listener (when the user crosses
    // the 760px breakpoint and the carousel turns on/off).
    var closestToCenter = function () {
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
      return best;
    };

    // IntersectionObserver — fires when a card crosses ~55% visibility.
    var cardsIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.intersectionRatio > 0.55) {
          var idx = cardsArr.indexOf(entry.target);
          if (idx !== -1) setActive(idx);
        }
      });
    }, { root: cardsEl, threshold: [0.55, 0.8] });
    cardsArr.forEach(function (card) { cardsIO.observe(card); });

    // Belt-and-suspenders scroll listener: in iOS WebKit the IO root=
    // scrollable-element path can miss intermediate states during fast
    // scroll. Finding the card whose center is closest to the scrollport
    // center is robust to that.
    var scrollRAF = null;
    cardsEl.addEventListener("scroll", function () {
      if (scrollRAF) return;
      scrollRAF = requestAnimationFrame(function () {
        scrollRAF = null;
        setActive(closestToCenter());
      });
    }, { passive: true });

    // Resize listener — when the user crosses the 760px breakpoint
    // (e.g. dragging the browser window narrower on desktop), the
    // .cards row flips between the desktop centered-flex layout and
    // the scrollable carousel. Re-derive activeIndex from the actual
    // scroll position so PREV/NEXT show the correct affordances for
    // what the user is currently looking at.
    window.addEventListener("resize", function () {
      if (!isCarousel()) return;
      var best = closestToCenter();
      if (best !== activeIndex) {
        activeIndex = best;
        syncArrows();
      }
    });

    // Initial state: card 1 active, arrows synced. Reset scrollLeft in
    // case the browser restored a non-zero position from history. Bypass
    // setActive's carousel-mode gate so this runs whether or not the
    // carousel is currently active — when the user later narrows the
    // viewport, activeIndex starts from a known zero.
    cardsEl.scrollLeft = 0;
    activeIndex = 0;
    syncArrows();
  }
})();
