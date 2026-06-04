/* ============================================================
   Digitals India — Landing Page Scripts
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Counter Animation (Stats Bar) ---- */
  const counters = document.querySelectorAll('[data-count]');

  const animateCounter = (el) => {
    const target   = parseInt(el.dataset.count, 10);
    const suffix   = el.dataset.suffix || '';
    const duration = 1800;
    const step     = 16;
    const increment = target / (duration / step);
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = Math.floor(current) + suffix;
    }, step);
  };

  const statsBar = document.querySelector('.stats-bar');
  let counted = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !counted) {
        counted = true;
        counters.forEach(animateCounter);
      }
    });
  }, { threshold: 0.4 });

  if (statsBar) observer.observe(statsBar);


  /* ---- Smooth reveal on scroll ---- */
  const revealEls = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealEls.forEach(el => revealObserver.observe(el));


  /* ---- Navbar shrink on scroll ---- */
  const navbar = document.querySelector('.navbar');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });

});


/* ---- Read More Toggle ---- */
function toggleReadMore(id, btn) {
  const el = document.getElementById(id);
  const isOpen = el.classList.toggle('open');
  btn.querySelector('span, i').className = isOpen
    ? 'bi bi-arrow-up ms-1'
    : 'bi bi-arrow-right ms-1';
  btn.childNodes[0].textContent = isOpen ? 'Read less ' : 'Read more ';
}


/* ============================================================
   EmailJS + CAPTCHA — Contact Form
   ============================================================ */

// 1. Init EmailJS
(function () {
  emailjs.init("lOGIFkCQD5VxJB4FP");
})();


// 2. CAPTCHA Logic
let correctAnswer = 0;

function generateCaptcha() {
  const ops = ['+', '-', '×'];
  const op  = ops[Math.floor(Math.random() * ops.length)];
  let a, b, answer;

  if (op === '+') {
    a = Math.floor(Math.random() * 20) + 1;
    b = Math.floor(Math.random() * 20) + 1;
    answer = a + b;
  } else if (op === '-') {
    a = Math.floor(Math.random() * 20) + 10;
    b = Math.floor(Math.random() * a) + 1;
    answer = a - b;
  } else {
    a = Math.floor(Math.random() * 9) + 2;
    b = Math.floor(Math.random() * 9) + 2;
    answer = a * b;
  }

  correctAnswer = answer;
  document.getElementById('captchaCanvas').textContent = `${a}  ${op}  ${b}  =  ?`;
  document.getElementById('captchaInput').value = '';

  const errorEl = document.getElementById('captchaError');
  if (errorEl) errorEl.style.display = 'none';
}

// Init CAPTCHA on page load
generateCaptcha();

// Refresh button
document.getElementById('refreshCaptcha')
  .addEventListener('click', generateCaptcha);


// 3. Single unified submit handler
document.getElementById('contactForm').addEventListener('submit', function (e) {
  e.preventDefault();

  // --- Step 1: Validate CAPTCHA first ---
  const captchaInput = document.getElementById('captchaInput').value.trim();
  const errorEl      = document.getElementById('captchaError');

  if (parseInt(captchaInput, 10) !== correctAnswer) {
    if (errorEl) errorEl.style.display = 'block';
    document.getElementById('captchaInput').value = '';
    document.getElementById('captchaInput').focus();
    return; // 
  }

  // CAPTCHA passed — hide error
  if (errorEl) {
    errorEl.style.display = 'none';

  }

  // --- Step 2: Send via EmailJS ---
  const name    = document.getElementById('name').value;
  const phone   = document.getElementById('phone').value;
  const email   = document.getElementById('email').value;
  const product = document.getElementById('product').value;

  emailjs.send("service_yej7rfp", "template_x36337e", {
    name:    name,
    phone:   phone,
    email:   email,
    product: product
  })
  .then(function () {
    swal("Success!", "Your callback request has been sent successfully!", "success");
    document.getElementById('contactForm').reset();
    generateCaptcha(); // Fresh CAPTCHA after success
  })
  .catch(function () {
    swal("Error!", "Failed to send request. Please try again.", "error");
  });

});