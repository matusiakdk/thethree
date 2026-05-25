/* ============================================================
   modal.js
   Post-signup enrichment modal.

   Wired to BOTH waitlist forms (hero + closing cta). The user
   clicks JOIN; if the email looks valid, the modal opens. The
   email is captured immediately — the modal's 5 fields are pure
   optional enrichment. Every path (X, Esc, backdrop click,
   "Skip for now", or Done) closes the modal.

   Independent of scripts/app.js. Order in <head> doesn't matter.
   ============================================================ */

(function () {

  // ============================================================
  // SUPABASE BACKEND
  // ============================================================
  // These two values are safe to ship to the browser. The
  // publishable key only works for operations Row Level Security
  // policies in the Supabase project allow (see SQL Editor on
  // table `waitlist`). The service_role key is NEVER placed here.
  //
  // To swap projects, change just these two lines.
  // ============================================================
  var SUPABASE_URL = "https://hevcnnemvpjkaptretom.supabase.co";
  var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhldmNubmVtdnBqa2FwdHJldG9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2Mjc2NzEsImV4cCI6MjA5NTIwMzY3MX0.-c1R1Zi5lM9MlwJy819V6i0DcDS9ruHWC63Mqr83kIg";

  function supabaseHeaders(prefer) {
    return {
      "apikey":        SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Content-Type":  "application/json",
      "Prefer":        prefer
    };
  }

  // Both functions call SECURITY DEFINER Postgres routines instead
  // of hitting the table directly. The routines bypass RLS, dedupe
  // on email via ON CONFLICT, and enforce the one-shot enrichment
  // rule server-side. Fire-and-forget — the UI never blocks on the
  // network.

  function insertEmail(email) {
    fetch(SUPABASE_URL + "/rest/v1/rpc/add_to_waitlist", {
      method: "POST",
      headers: supabaseHeaders("return=minimal"),
      body: JSON.stringify({ p_email: email })
    }).catch(function (err) {
      console.error("[waitlist] insertEmail failed", err);
    });
  }

  function enrichEmail(email, fields) {
    fetch(SUPABASE_URL + "/rest/v1/rpc/enrich_waitlist", {
      method: "POST",
      headers: supabaseHeaders("return=minimal"),
      body: JSON.stringify({
        p_email:      email,
        p_first_name: fields.firstName || null,
        p_stage:      fields.stage     || null,
        p_industry:   fields.industry  || null,
        p_country:    fields.country   || null,
        p_source:     fields.source    || null
      })
    }).catch(function (err) {
      console.error("[waitlist] enrichEmail failed", err);
    });
  }

  // ============================================================
  // LOOPS (welcome email + audience sync)
  // ============================================================
  // Hits our own Pages Function (/api/loops) — which holds the
  // Loops API key in a Cloudflare env var. The browser never sees
  // the key. Upsert: first call fires the "Contact added" workflow
  // (welcome email), follow-up call after enrichment fills in name
  // and other fields for future campaigns.
  function pushToLoops(payload) {
    fetch("/api/loops", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload)
    }).catch(function (err) {
      console.error("[waitlist] pushToLoops failed", err);
    });
  }

  var modal = document.getElementById("signup-modal");
  if (!modal) return;

  var form        = modal.querySelector(".modal__form");
  var successEl   = modal.querySelector(".modal__success");

  // ---------- Country list ----------
  // UAE pinned at top (project's launch market), then alphabetical.
  // Stored here, not in HTML, to keep markup compact and the list
  // easy to maintain.
  var COUNTRIES = [
    "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda",
    "Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain",
    "Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia",
    "Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso",
    "Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic",
    "Chad","Chile","China","Colombia","Comoros","Congo (DRC)","Congo (Republic)",
    "Costa Rica","Côte d'Ivoire","Croatia","Cuba","Cyprus","Czechia","Denmark",
    "Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador",
    "Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland",
    "France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada",
    "Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary",
    "Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
    "Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait",
    "Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya",
    "Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia",
    "Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius",
    "Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco",
    "Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand",
    "Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway",
    "Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay",
    "Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda",
    "Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines",
    "Samoa","San Marino","São Tomé and Príncipe","Saudi Arabia","Senegal","Serbia",
    "Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands",
    "Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka",
    "Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan",
    "Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago",
    "Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Kingdom",
    "United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela",
    "Vietnam","Yemen","Zambia","Zimbabwe"
  ];

  function populateCountries() {
    var countryCombo = modal.querySelector('[data-name="country"]');
    if (!countryCombo) return;
    var list = countryCombo.querySelector(".combobox__list");
    if (!list) return;

    // UAE pinned (project launch market), then a non-interactive separator,
    // then the rest of the world alphabetically.
    var html = '<li class="combobox__option" role="option" id="country-opt-ae"'
             + ' data-value="United Arab Emirates" aria-selected="true">'
             + 'United Arab Emirates</li>';
    html += '<li class="combobox__option--separator" role="presentation">'
          + '———</li>';
    COUNTRIES.forEach(function (c, i) {
      html += '<li class="combobox__option" role="option" id="country-opt-' + i + '"'
            + ' data-value="' + c + '">' + c + '</li>';
    });
    list.innerHTML = html;

    // Mirror the default into the visible value + hidden input.
    var valueEl = countryCombo.querySelector(".combobox__value");
    var hidden  = countryCombo.querySelector('input[type="hidden"]');
    if (valueEl) {
      valueEl.textContent = "United Arab Emirates";
      valueEl.classList.remove("is-placeholder");
    }
    if (hidden) hidden.value = "United Arab Emirates";
  }

  populateCountries();

  // ---------- Combobox component (custom ARIA listbox) ----------
  // Pattern: trigger + listbox, with aria-activedescendant on the trigger
  // pointing at the highlighted option. The listbox itself does not take
  // focus — keystrokes are handled on the trigger. This matches the
  // WAI-ARIA listbox pattern and works for screen readers + keyboard.

  function setupCombobox(combobox) {
    var trigger = combobox.querySelector(".combobox__trigger");
    var valueEl = combobox.querySelector(".combobox__value");
    var list    = combobox.querySelector(".combobox__list");
    var hidden  = combobox.querySelector('input[type="hidden"]');
    if (!trigger || !list) return;

    var highlightedIndex = -1;
    var typeBuffer = "";
    var typeTimer  = null;

    function options() {
      return Array.prototype.slice.call(
        list.querySelectorAll('.combobox__option:not(.combobox__option--separator)')
      );
    }

    function openList() {
      list.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      // Start highlight on the current selection, else the first option.
      var opts = options();
      var selected = opts.findIndex(function (o) {
        return o.getAttribute("aria-selected") === "true";
      });
      setHighlight(selected >= 0 ? selected : 0);
    }

    function closeList() {
      list.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      trigger.removeAttribute("aria-activedescendant");
      highlightedIndex = -1;
      var opts = options();
      opts.forEach(function (o) { o.classList.remove("is-highlighted"); });
    }

    function setHighlight(idx) {
      var opts = options();
      if (opts.length === 0) return;
      if (idx < 0) idx = opts.length - 1;
      if (idx >= opts.length) idx = 0;
      highlightedIndex = idx;
      opts.forEach(function (o, i) {
        o.classList.toggle("is-highlighted", i === idx);
      });
      var current = opts[idx];
      if (current.id) trigger.setAttribute("aria-activedescendant", current.id);
      // Keep the highlight visible inside the scrollable panel.
      current.scrollIntoView({ block: "nearest" });
    }

    function selectOption(opt) {
      if (!opt) return;
      options().forEach(function (o) {
        o.setAttribute("aria-selected", o === opt ? "true" : "false");
      });
      valueEl.textContent = opt.textContent;
      valueEl.classList.remove("is-placeholder");
      if (hidden) hidden.value = opt.getAttribute("data-value") || opt.textContent;
    }

    trigger.addEventListener("click", function () {
      if (list.hidden) openList(); else closeList();
    });

    trigger.addEventListener("keydown", function (e) {
      // Closed: open on Enter/Space/Arrow, otherwise default behavior.
      if (list.hidden) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp"
         || e.key === "Enter"     || e.key === " ") {
          e.preventDefault();
          openList();
        }
        return;
      }

      // Open: full keyboard control.
      switch (e.key) {
        case "ArrowDown": e.preventDefault(); setHighlight(highlightedIndex + 1); break;
        case "ArrowUp":   e.preventDefault(); setHighlight(highlightedIndex - 1); break;
        case "Home":      e.preventDefault(); setHighlight(0); break;
        case "End":       e.preventDefault(); setHighlight(options().length - 1); break;
        case "Enter":
        case " ":
          e.preventDefault();
          selectOption(options()[highlightedIndex]);
          closeList();
          break;
        case "Escape":
          // Stop the modal-wide Esc handler from also firing.
          e.preventDefault();
          e.stopPropagation();
          closeList();
          break;
        case "Tab":
          // Let Tab move focus naturally — just close the panel first.
          closeList();
          break;
        default:
          // Type-ahead: single printable char appends to buffer (cleared
          // after 700ms idle); jump to first option starting with buffer.
          if (e.key.length === 1) {
            typeBuffer += e.key.toLowerCase();
            if (typeTimer) clearTimeout(typeTimer);
            typeTimer = setTimeout(function () { typeBuffer = ""; }, 700);
            var opts = options();
            for (var i = 0; i < opts.length; i++) {
              if (opts[i].textContent.toLowerCase().indexOf(typeBuffer) === 0) {
                setHighlight(i);
                break;
              }
            }
          }
      }
    });

    list.addEventListener("click", function (e) {
      var opt = e.target.closest('.combobox__option:not(.combobox__option--separator)');
      if (!opt) return;
      selectOption(opt);
      closeList();
      trigger.focus();
    });

    list.addEventListener("mousemove", function (e) {
      var opt = e.target.closest('.combobox__option:not(.combobox__option--separator)');
      if (!opt) return;
      var idx = options().indexOf(opt);
      if (idx >= 0 && idx !== highlightedIndex) setHighlight(idx);
    });

    // Outside click closes the panel without changing the value.
    document.addEventListener("mousedown", function (e) {
      if (list.hidden) return;
      if (!combobox.contains(e.target)) closeList();
    });

    // Expose a reset for the form's resetForm() to call between sessions.
    combobox._reset = function (defaultValue) {
      var opts = options();
      var match = opts.find(function (o) { return o.getAttribute("data-value") === defaultValue; });
      if (match) {
        selectOption(match);
      } else {
        opts.forEach(function (o) { o.setAttribute("aria-selected", "false"); });
        var placeholder = valueEl.getAttribute("data-placeholder") || "";
        valueEl.textContent = placeholder;
        valueEl.classList.add("is-placeholder");
        if (hidden) hidden.value = "";
      }
      closeList();
    };
  }

  modal.querySelectorAll(".combobox").forEach(setupCombobox);

  // ---------- "Seen" tracking (per-email, in localStorage) ----------
  // We track which *emails* have already gone through the modal on this
  // browser — not a single browser-wide boolean. This unblocks the
  // shared-device case (two founders on the same laptop, different
  // emails) which a global flag silently broke: the second friend would
  // hit "you're already in" even though their email had never been
  // submitted.
  //
  // Skip, submit, X, Esc, backdrop click — all count as "seen" for the
  // current email. Set on close (not on open) so the email has to
  // actually have been *engaged with* to count.
  //
  // Storage shape: JSON array of lowercased trimmed emails.
  // localStorage limits (~5MB) are far above what this can ever fill.
  var STORAGE_KEY = "thethree:modal:seenEmails";

  function normalizeEmail(email) {
    return (email || "").toLowerCase().trim();
  }

  function getSeenEmails() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function hasEmailBeenSeen(email) {
    var normalized = normalizeEmail(email);
    if (!normalized) return false;
    return getSeenEmails().indexOf(normalized) !== -1;
  }

  function markEmailAsSeen(email) {
    var normalized = normalizeEmail(email);
    if (!normalized) return;
    try {
      var emails = getSeenEmails();
      if (emails.indexOf(normalized) !== -1) return;
      emails.push(normalized);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(emails));
    } catch (e) { /* localStorage may be blocked (private mode, etc.) — no-op */ }
  }

  // ---------- Open / close ----------

  var lastFocus  = null;
  var closeTimer = null;  // pending 3.5s auto-close after Done; cleared on any manual close

  function open() {
    lastFocus = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";

    // Focus the first interactive field (after the close button).
    var firstField = modal.querySelector(".field__input");
    if (firstField) setTimeout(function () { firstField.focus(); }, 60);
  }

  function close() {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    // Mark THIS email as seen — not the browser globally. Lets the next
    // friend on the same laptop with a different email actually sign up.
    markEmailAsSeen(modal.dataset.email);
    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus();
    }
  }

  // Backdrop click, X button, Skip link — all marked with data attribute.
  // All paths close immediately. The success view is reserved for Done.
  modal.querySelectorAll("[data-modal-close]").forEach(function (el) {
    el.addEventListener("click", close);
  });

  // ---------- Keyboard: Esc to close, Tab to stay trapped ----------

  function getFocusable() {
    var selector = 'a[href], button:not([disabled]), input:not([disabled]),'
                 + ' select:not([disabled]), textarea:not([disabled]),'
                 + ' [tabindex]:not([tabindex="-1"])';
    return Array.prototype.slice.call(modal.querySelectorAll(selector))
      .filter(function (el) {
        // Drop hidden elements (e.g. the success block when not active)
        return !el.hidden && el.offsetParent !== null;
      });
  }

  document.addEventListener("keydown", function (e) {
    if (!modal.classList.contains("is-open")) return;

    if (e.key === "Escape") {
      close();
      return;
    }

    if (e.key === "Tab") {
      var focusable = getFocusable();
      if (focusable.length === 0) { e.preventDefault(); return; }
      var first = focusable[0];
      var last  = focusable[focusable.length - 1];
      var active = document.activeElement;

      if (e.shiftKey && (active === first || !modal.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !modal.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // ---------- Pills / choices (single-select within each group) ----------

  // Generalized single-select: a `.pills` group (round chips) and a
  // `.choices` group (cards with heading + description) share the same
  // selection semantics. Implements the WAI-ARIA radiogroup pattern:
  //   - Click any item → selects it.
  //   - Arrow keys (Up/Down/Left/Right) move focus AND selection
  //     ("selection follows focus" — the most common pattern, and
  //     what screen-reader users expect from a radiogroup).
  //   - Home / End jump to first / last.
  //   - Roving tabindex: only the active item is tabbable, so Tab
  //     enters and exits the group without cycling through every
  //     pill (which would be a UX cliff with 5+ options).

  modal.querySelectorAll(".pills, .choices").forEach(function (group) {
    var items = Array.prototype.slice.call(
      group.querySelectorAll(".pill, .choice")
    );
    if (!items.length) return;

    // Initial roving tabindex: first item enters the tab order.
    items.forEach(function (el, i) {
      if (!el.hasAttribute("tabindex")) {
        el.setAttribute("tabindex", i === 0 ? "0" : "-1");
      }
    });

    function selectItem(item, opts) {
      opts = opts || {};
      items.forEach(function (el) {
        var isSelected = el === item;
        el.classList.toggle("is-selected", isSelected);
        el.setAttribute("aria-checked", isSelected ? "true" : "false");
        el.setAttribute("tabindex", isSelected ? "0" : "-1");
      });
      if (opts.focus !== false) item.focus();
    }

    group.addEventListener("click", function (e) {
      var item = e.target.closest(".pill, .choice");
      if (!item || !group.contains(item)) return;
      // Don't yank focus on a mouse click — keyboard users get focus,
      // mouse users keep their existing focus position.
      selectItem(item, { focus: false });
    });

    group.addEventListener("keydown", function (e) {
      var current = document.activeElement;
      var idx = items.indexOf(current);
      if (idx === -1) return;

      var nextIdx = null;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          nextIdx = (idx + 1) % items.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          nextIdx = (idx - 1 + items.length) % items.length;
          break;
        case "Home":
          nextIdx = 0;
          break;
        case "End":
          nextIdx = items.length - 1;
          break;
        case " ":
        case "Enter":
          // Space / Enter on a button would already fire click, but
          // explicitly handling here makes the contract clear and
          // prevents page-scroll on Space.
          e.preventDefault();
          selectItem(current);
          return;
        default:
          return;
      }

      e.preventDefault();
      selectItem(items[nextIdx]);
    });
  });

  // ---------- Trigger: wire JOIN buttons on both waitlist forms ----------
  // We attach to the button itself rather than form submit because the
  // markup uses type="button" (no implicit submit).

  document.querySelectorAll(".waitlist__form, .cta-form").forEach(function (f) {
    var btn   = f.querySelector(".waitlist__btn");
    var input = f.querySelector(".waitlist__input");
    // Inline status line that sits between the form and the count copy.
    // Used for empty-email, bad-format, and already-on-list feedback.
    var fb    = f.parentElement.querySelector(".form-feedback");
    if (!btn || !input) return;

    function showFb(message, state) {
      if (!fb) return;
      fb.textContent = message;
      fb.dataset.state = state || "info";
      fb.hidden = false;
      if (fb._timer) clearTimeout(fb._timer);
      // Success messages linger a touch longer than corrections.
      var duration = state === "success" ? 4000 : 3000;
      fb._timer = setTimeout(function () {
        fb.hidden = true;
        delete fb.dataset.state;
      }, duration);
    }

    function clearFb() {
      if (!fb) return;
      fb.hidden = true;
      if (fb._timer) clearTimeout(fb._timer);
      delete fb.dataset.state;
    }

    function attemptOpen() {
      var email = input.value.trim();
      if (!email) {
        showFb("Enter your email to join.", "info");
        input.focus();
        return;
      }
      if (!isValidEmail(email)) {
        showFb("That email looks off — give it another check.", "info");
        input.focus();
        return;
      }
      modal.dataset.email = email;
      // Capture the email in Supabase the moment JOIN is clicked.
      // The modal is enrichment-only — even if the user dismisses
      // it or closes the tab, the email is already on the list.
      insertEmail(email);
      // Mirror into Loops so the welcome workflow fires immediately.
      pushToLoops({ email: email });
      // This specific email already gone through the modal on this
      // browser? Skip the modal but confirm the signup so the click
      // isn't silent. A different email (e.g. a friend on the same
      // laptop) gets the full modal — that's the whole point of
      // tracking per-email instead of per-browser.
      if (hasEmailBeenSeen(email)) {
        showFb("You’re already in. We’ll email you the moment The Three opens.", "success");
        return;
      }
      clearFb();
      open();
    }

    btn.addEventListener("click", attemptOpen);
    // Pressing Enter inside the email field should also submit.
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        attemptOpen();
      }
    });
    // Any keystroke clears a stale feedback message so the user isn't
    // looking at outdated text while they're correcting their input.
    input.addEventListener("input", clearFb);
  });

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  // ---------- Form submit ----------
  // Done → show success state for 3.5s → auto-close. X remains available
  // for immediate close at any point (the click handler calls close()
  // which clears the pending timer).

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = modal.dataset.email;
      if (email) {
        var fields = collectModalFields();
        enrichEmail(email, fields);
        // Update the Loops contact with the enrichment fields so
        // future campaigns can personalize / segment.
        pushToLoops({
          email:     email,
          firstName: fields.firstName,
          stage:     fields.stage,
          industry:  fields.industry,
          country:   fields.country,
          howFound:  fields.source
        });
      }
      showSuccessThenClose();
    });
  }

  // Reads the 5 modal fields into a flat object. firstName lives
  // in a regular input; industry and country are stored in hidden
  // inputs populated by the combobox; stage and source are pill/
  // choice groups where the active item carries `.is-selected`.
  function collectModalFields() {
    function selectedValue(name) {
      var el = modal.querySelector('[data-name="' + name + '"].is-selected');
      return el ? el.getAttribute("data-value") : null;
    }
    var data = form ? new FormData(form) : null;
    return {
      firstName: data ? (data.get("firstName") || "").trim() : "",
      stage:     selectedValue("stage"),
      industry:  data ? data.get("industry") : null,
      country:   data ? data.get("country")  : null,
      source:    selectedValue("source")
    };
  }

  function showSuccessThenClose() {
    if (form) form.hidden = true;
    if (successEl) successEl.hidden = false;
    closeTimer = setTimeout(close, 3500);
    // Reset slightly after close so the modal's fade-out doesn't reveal
    // a flicker of the form returning. resetForm is harmless if called
    // after the modal has been removed.
    setTimeout(resetForm, 4100);
  }

  function resetForm() {
    if (form) {
      form.hidden = false;
      form.reset();
    }
    if (successEl) successEl.hidden = true;
    modal.querySelectorAll(".pill.is-selected, .choice.is-selected").forEach(function (el) {
      el.classList.remove("is-selected");
      el.setAttribute("aria-checked", "false");
    });
    // Reset each custom dropdown to its default (UAE for country, blank for industry).
    var countryCb  = modal.querySelector('[data-name="country"]');
    var industryCb = modal.querySelector('[data-name="industry"]');
    if (countryCb  && countryCb._reset)  countryCb._reset("United Arab Emirates");
    if (industryCb && industryCb._reset) industryCb._reset(null);
  }
})();
