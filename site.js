/* coolturkey — interaction layer.
   No dependencies, no build step, ~3KB. Everything here is additive: with the
   script blocked or broken the site is still fully readable and usable, which
   is the point of keeping it static in the first place. */

(function () {
  'use strict';

  var reduced = window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- evict the previous site's service worker ----
     coolturkey.org used to host a PWA. Anyone who installed it still has a
     service worker that will happily serve the old app over the top of this
     one, and they may never load the teardown page that was meant to clear it.
     So: unregister anything registered here, drop its caches, and reload once.
     The reload is guarded by sessionStorage so it can never loop. */

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      if (!regs.length) return;
      Promise.all(regs.map(function (r) { return r.unregister(); })).then(function () {
        if ('caches' in window) {
          caches.keys().then(function (keys) {
            keys.forEach(function (k) { caches.delete(k); });
          });
        }
        try {
          if (!sessionStorage.getItem('ct-sw-cleared')) {
            sessionStorage.setItem('ct-sw-cleared', '1');
            location.reload();
          }
        } catch (e) {}
      });
    }).catch(function () {});
  }


  /* ---- theme ----
     Light is the default. The choice persists per visitor, and the toggle is
     built here rather than sitting in the HTML so it can never appear on a
     page where the script failed to load. */

  var THEME_KEY = 'ct-theme';
  var root = document.documentElement;

  function applyTheme(name) {
    if (name === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
  }

  try { applyTheme(localStorage.getItem(THEME_KEY)); } catch (e) {}

  var nav = document.querySelector('.site-nav');
  if (nav) {
    var toggle = document.createElement('button');
    toggle.className = 'theme-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Switch between light and dark');
    toggle.innerHTML =
      '<svg class="sun" viewBox="0 0 24 24" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="4.2"/>' +
        '<path d="M12 2.4v2M12 19.6v2M2.4 12h2M19.6 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/>' +
      '</svg>' +
      '<svg class="moon" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2z"/>' +
      '</svg>';
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });
    nav.appendChild(toggle);
  }


  /* ---- email signup ----
     One constant turns this on across all 16 pages. Leave it empty and nothing
     renders at all, because a signup box that cannot sign anyone up is worse
     than no box. Paste the Buttondown (or equivalent) form action in and the
     block appears everywhere on the next deploy.

     Deliberately a plain HTML form POST: no third-party script, no tracking
     pixel, and it still works with JavaScript disabled once rendered. */

  var SIGNUP_ENDPOINT = '';   // e.g. 'https://buttondown.com/api/emails/embed-subscribe/coolturkey'

  if (SIGNUP_ENDPOINT) {
    var footer = document.querySelector('.site-footer');
    if (footer) {
      var box = document.createElement('section');
      box.className = 'signup';
      box.innerHTML =
        '<div class="wrap">' +
          '<h2>Get the next one</h2>' +
          '<p>New Cold Takes and anything that changes on the numbers side. No more than ' +
            'one email a week, and every correction goes out too, not just the wins.</p>' +
          '<form action="' + SIGNUP_ENDPOINT + '" method="post" target="_blank">' +
            '<label for="bd-email" class="sr-only" style="position:absolute;left:-9999px">Email address</label>' +
            '<input type="email" name="email" id="bd-email" placeholder="you@example.com" required autocomplete="email">' +
            '<button type="submit">Subscribe</button>' +
          '</form>' +
          '<p class="fine">This is the one place on the site where something you type does leave ' +
            'your browser, and only because it has to. The tools do not: everything you enter in ' +
            'the split sheet or the calculators stays on your machine. Unsubscribe whenever, and ' +
            'the list is never sold or shared. <a href="/how-it-works">How it works</a>.</p>' +
        '</div>';
      footer.parentNode.insertBefore(box, footer);
    }
  }

  /* ---- header goes solid once you've left the top ---- */

  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- reading progress, articles only ----
     Measured against the article body rather than the whole document, so the
     footer and receipts don't make the bar lie about how much is left. */

  var article = document.querySelector('main.article');
  if (article && !reduced) {
    var bar = document.createElement('div');
    bar.className = 'progress';
    document.body.appendChild(bar);

    var tick = function () {
      var box = article.getBoundingClientRect();
      var total = box.height - window.innerHeight;
      if (total <= 0) { bar.style.width = '0'; return; }
      var seen = Math.min(Math.max(-box.top, 0), total);
      bar.style.width = (seen / total * 100) + '%';
    };
    tick();
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick, { passive: true });
  }

  /* ---- headline arrives a word at a time ----
     Split before first paint so nothing visibly reflows. The CSS animation
     does the work; this only supplies the spans and their index. */

  var heroH1 = document.querySelector('.hero h1');
  if (heroH1 && !reduced && heroH1.children.length === 0) {
    var words = heroH1.textContent.trim().split(/\s+/);
    heroH1.textContent = '';
    words.forEach(function (word, i) {
      var span = document.createElement('span');
      span.className = 'w';
      span.style.setProperty('--i', i);
      span.textContent = word;
      heroH1.appendChild(span);
      if (i < words.length - 1) heroH1.appendChild(document.createTextNode(' '));
    });
  }

  /* ---- the room light follows the pointer ----
     Only ever writes two custom properties, and only once per frame, so the
     work stays on the compositor instead of causing layout. */

  var hasPointer = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  if (hasPointer && !reduced) {
    var px = 14, py = 6, queued = false;
    document.addEventListener('pointermove', function (e) {
      px = (e.clientX / window.innerWidth) * 100;
      py = (e.clientY / window.innerHeight) * 100;
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        document.body.style.setProperty('--px', px.toFixed(2) + '%');
        document.body.style.setProperty('--py', py.toFixed(2) + '%');
        queued = false;
      });
    }, { passive: true });
  }

  /* ---- cursor spotlight on cards ----
     Writes the pointer position into CSS custom properties and lets the
     stylesheet do the drawing. Skipped entirely on touch, where there is no
     hover to track. */

  var canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  if (canHover) {
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest ? e.target.closest('.card') : null;
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
      card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
    }, { passive: true });
  }

  /* ---- reveal on scroll ----
     Tag the things worth staggering, then let IntersectionObserver bring them
     in once. Anything already on screen at load is revealed immediately so the
     first paint never looks broken. */

  if (!reduced && 'IntersectionObserver' in window) {
    /* The hero is deliberately NOT in this list. It sits above the fold, it is
       the first thing anyone sees, and it already has the word-by-word headline
       animation. Fading it in as well stacks two opacity systems on top of each
       other and leaves the most important text on the site translucent for the
       best part of a second on every visit. */
    var targets = document.querySelectorAll(
      '.section-head, .card, .lead, .stats, .callout, .receipts, .chart, ' +
      '.table-scroll, .box-list, .buy-band, .for-card, .pull, .steps'
    );

    Array.prototype.forEach.call(targets, function (el) {
      el.classList.add('reveal');
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // stagger siblings so a row of cards arrives as a sequence, not a slab
        var sibs = el.parentNode ? Array.prototype.indexOf.call(el.parentNode.children, el) : 0;
        el.style.transitionDelay = Math.min(sibs, 4) * 70 + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    Array.prototype.forEach.call(targets, function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight) {
        el.classList.add('is-in');   // already visible: don't animate it in
      } else {
        io.observe(el);
      }
    });

    /* Safety net, and it is not optional.
     *
     * IntersectionObserver only reports elements that actually pass through
     * the viewport. Jump the page instead of scrolling it — an anchor link,
     * the End key, dragging the scrollbar, restoring a scroll position on
     * reload — and every element skipped over never intersects, never fires,
     * and stays at opacity 0 forever. Content silently disappears.
     *
     * So on every scroll, sweep anything that is now at or above the fold and
     * reveal it regardless of whether the observer ever saw it. Throttled to
     * one pass per frame. */
    var sweeping = false;
    var sweep = function () {
      if (sweeping) return;
      sweeping = true;
      requestAnimationFrame(function () {
        var pending = document.querySelectorAll('.reveal:not(.is-in)');
        Array.prototype.forEach.call(pending, function (el) {
          if (el.getBoundingClientRect().top < window.innerHeight) {
            el.style.transitionDelay = '0ms';
            el.classList.add('is-in');
            io.unobserve(el);
          }
        });
        sweeping = false;
      });
    };
    window.addEventListener('scroll', sweep, { passive: true });
    window.addEventListener('resize', sweep, { passive: true });
    window.addEventListener('load', sweep);
  }
})();
