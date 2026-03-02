/* ══════════════════════════════════════════════════ */
/* MX Detail — Main JavaScript                       */
/* ══════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Reduced Motion Check ──
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Mobile Detection ──
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

  // ══════════════════════════════════════
  // HERO SLIDESHOW
  // ══════════════════════════════════════
  var heroSlides = document.querySelectorAll('.hero-slide');
  if (heroSlides.length > 1) {
    var currentSlide = 0;
    var slideInterval = setInterval(function () {
      heroSlides[currentSlide].classList.remove('active');
      currentSlide = (currentSlide + 1) % heroSlides.length;
      heroSlides[currentSlide].classList.add('active');
    }, 7000); // Cinematic pace — 7 second hold per slide
  }

  // ══════════════════════════════════════
  // NAVBAR SCROLL TRANSITION
  // ══════════════════════════════════════
  const navbar = document.querySelector('.navbar');
  const topBar = document.querySelector('.top-bar');

  function handleNavScroll() {
    if (!navbar) return;
    const scrolled = window.scrollY > 50;
    navbar.classList.toggle('scrolled', scrolled);
  }

  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll(); // Run on load

  // ══════════════════════════════════════
  // HERO PARALLAX DEPTH (text floats on scroll)
  // ══════════════════════════════════════
  const heroContent = document.querySelector('.hero-content');
  if (heroContent && !prefersReducedMotion) {
    window.addEventListener('scroll', function () {
      var scrollY = window.scrollY;
      var heroHeight = document.querySelector('.hero').offsetHeight;
      if (scrollY < heroHeight) {
        var offset = scrollY * 0.3;
        var opacity = 1 - (scrollY / heroHeight) * 0.6;
        heroContent.style.transform = 'translateY(' + offset + 'px)';
        heroContent.style.opacity = Math.max(opacity, 0);
      }
    }, { passive: true });
  }

  // ══════════════════════════════════════
  // HAMBURGER MENU
  // ══════════════════════════════════════
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = mobileMenu ? mobileMenu.querySelectorAll('a') : [];
  let menuOpen = false;

  function openMenu() {
    menuOpen = true;
    navToggle.classList.add('open');
    navToggle.setAttribute('aria-expanded', 'true');
    mobileMenu.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Focus first link
    if (mobileLinks.length > 0) {
      setTimeout(function () { mobileLinks[0].focus(); }, 100);
    }
  }

  function closeMenu() {
    menuOpen = false;
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
    navToggle.focus();
  }

  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', function () {
      if (menuOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuOpen) {
        closeMenu();
      }
    });

    // Close when clicking a link
    mobileLinks.forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    // Focus trap
    document.addEventListener('keydown', function (e) {
      if (!menuOpen || e.key !== 'Tab') return;

      var focusable = mobileMenu.querySelectorAll('a, button');
      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  // ══════════════════════════════════════
  // SCROLL ANIMATIONS (IntersectionObserver)
  // ══════════════════════════════════════
  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('.fade-up').forEach(function (el) {
      observer.observe(el);
    });
  } else {
    // If reduced motion or no IntersectionObserver, show everything
    document.querySelectorAll('.fade-up').forEach(function (el) {
      el.classList.add('visible');
    });
  }

  // ══════════════════════════════════════
  // PACKAGE ACCORDIONS
  // ══════════════════════════════════════
  document.querySelectorAll('.pkg-header').forEach(function (header) {
    header.addEventListener('click', function () {
      var accordion = this.closest('.pkg-accordion');
      var isOpen = accordion.classList.contains('open');

      // Close all other accordions in the same category
      var category = accordion.closest('.pkg-category');
      if (category) {
        category.querySelectorAll('.pkg-accordion.open').forEach(function (openItem) {
          if (openItem !== accordion) {
            openItem.classList.remove('open');
            openItem.querySelector('.pkg-header').setAttribute('aria-expanded', 'false');
          }
        });
      }

      // Toggle this one
      accordion.classList.toggle('open', !isOpen);
      this.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  // ══════════════════════════════════════
  // COATING CARD DETAILS TOGGLE
  // ══════════════════════════════════════
  document.querySelectorAll('.coating-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var details = this.nextElementSibling;
      var isOpen = details.classList.contains('open');

      // Toggle this one
      details.classList.toggle('open', !isOpen);
      this.setAttribute('aria-expanded', String(!isOpen));
      this.textContent = '';
      this.innerHTML = (!isOpen ? 'Hide Details' : 'View Details') +
        ' <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
    });
  });

  // ══════════════════════════════════════
  // PARALLAX — MOBILE FALLBACK
  // ══════════════════════════════════════
  if (isMobile) {
    document.querySelectorAll('.hero, .parallax-cta').forEach(function (el) {
      el.style.backgroundAttachment = 'scroll';
    });
  }

  // ══════════════════════════════════════
  // GOOGLE REVIEWS CAROUSEL
  // ══════════════════════════════════════
  var reviewsTrack = document.getElementById('reviewsTrack');
  var reviewsDots = document.getElementById('reviewsDots');
  var reviewsPrev = document.getElementById('reviewsPrev');
  var reviewsNext = document.getElementById('reviewsNext');

  // ── Review Data ── Edit this array to update reviews ──
  var googleReviews = [
    {
      name: "Joe M.",
      date: "2 months ago",
      rating: 5,
      text: "Joe did a full detailing on my 2017 MB and I am super impressed! Not only does my car look like I just got it from the showroom, but Joe was super friendly and made the whole process fun. Not only does the outside look great but he also cleaned out all the brake dust from inside."
    },
    {
      name: "Sarah K.",
      date: "3 months ago",
      rating: 5,
      text: "Joe just finished detailing my wife's 2022 Buick Envision. He did an absolutely amazing job. The car looks brand new. Will definitely be using MX Detail again for all our vehicles."
    },
    {
      name: "Mike R.",
      date: "1 month ago",
      rating: 5,
      text: "Best detailing service in Central Florida. The ceramic coating they applied is incredible — water just beads right off. My car has never looked this good, even when it was brand new off the lot."
    },
    {
      name: "Jessica T.",
      date: "4 months ago",
      rating: 5,
      text: "The mobile detailing service is so convenient. They came right to my office and the results were outstanding. Professional, thorough, and meticulous. Highly recommend MX Detail to anyone!"
    },
    {
      name: "David L.",
      date: "2 weeks ago",
      rating: 5,
      text: "Had my boat detailed by the MX Detail team and they did an incredible job. Every surface was spotless. They really know what they're doing with marine detailing. Will be a repeat customer for sure."
    },
    {
      name: "Chris W.",
      date: "3 weeks ago",
      rating: 5,
      text: "I hired them to surprise my husband by cleaning his old truck that had been cosmetically neglected for years. I would have never imagined the truck could look that good again. Absolutely transformed it."
    },
    {
      name: "Amanda P.",
      date: "5 months ago",
      rating: 5,
      text: "Professional, knowledgeable, and truly passionate about what they do. The Ceramic Pro coating they applied made my car look brand new, and months later it still shines like the day I picked it up."
    },
    {
      name: "Roberto G.",
      date: "1 month ago",
      rating: 5,
      text: "Third time using MX Detail and they never disappoint. Consistent quality every single time. My car looks brand new after every visit. The attention to detail is unmatched in the Orlando area."
    },
    {
      name: "Tanya B.",
      date: "6 months ago",
      rating: 5,
      text: "Found MX Detail through a friend's recommendation and I'm so glad I did. They treated my car like it was their own. Interior looks and smells brand new. Worth every penny. Five stars all around."
    }
  ];

  if (reviewsTrack && googleReviews.length > 0) {
    // Build review cards
    googleReviews.forEach(function (review) {
      var stars = '';
      for (var s = 0; s < review.rating; s++) stars += '★';

      var card = document.createElement('div');
      card.className = 'review-card';
      card.innerHTML =
        '<div class="review-card-header">' +
          '<div class="review-avatar">' + review.name.charAt(0) + '</div>' +
          '<div class="review-meta">' +
            '<span class="review-author">' + review.name + '</span>' +
            '<span class="review-date">' + review.date + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="review-stars">' + stars + '</div>' +
        '<p class="review-text">"' + review.text + '"</p>';

      reviewsTrack.appendChild(card);
    });

    // Carousel logic
    var currentPage = 0;

    function getCardsPerPage() {
      var w = window.innerWidth;
      if (w < 640) return 1;
      if (w < 1024) return 2;
      return 3;
    }

    function getTotalPages() {
      return Math.ceil(googleReviews.length / getCardsPerPage());
    }

    function updateCarousel() {
      var perPage = getCardsPerPage();
      var cards = reviewsTrack.querySelectorAll('.review-card');
      var cardWidth = cards[0] ? cards[0].offsetWidth + 24 : 0; // 24 = gap
      var offset = currentPage * perPage * cardWidth;
      reviewsTrack.style.transform = 'translateX(-' + offset + 'px)';

      // Update dots
      if (reviewsDots) {
        reviewsDots.innerHTML = '';
        var total = getTotalPages();
        for (var d = 0; d < total; d++) {
          var dot = document.createElement('button');
          dot.className = 'reviews-dot' + (d === currentPage ? ' active' : '');
          dot.setAttribute('aria-label', 'Go to page ' + (d + 1));
          dot.dataset.page = d;
          dot.addEventListener('click', function () {
            currentPage = parseInt(this.dataset.page);
            updateCarousel();
          });
          reviewsDots.appendChild(dot);
        }
      }
    }

    if (reviewsPrev) {
      reviewsPrev.addEventListener('click', function () {
        currentPage = Math.max(0, currentPage - 1);
        updateCarousel();
      });
    }

    if (reviewsNext) {
      reviewsNext.addEventListener('click', function () {
        currentPage = Math.min(getTotalPages() - 1, currentPage + 1);
        updateCarousel();
      });
    }

    // Init
    updateCarousel();

    // Recalculate on resize
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        currentPage = 0;
        updateCarousel();
      }, 200);
    });

    // Auto-advance every 8 seconds
    if (!prefersReducedMotion) {
      setInterval(function () {
        currentPage = (currentPage + 1) % getTotalPages();
        updateCarousel();
      }, 8000);
    }
  }

  // ══════════════════════════════════════
  // SMOOTH SCROLL FOR ANCHOR LINKS
  // ══════════════════════════════════════
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        var offset = navbar ? navbar.offsetHeight + 20 : 20;
        var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    });
  });

})();
