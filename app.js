'use strict';

const AgeCalculator = (function () {

  const ZODIAC_SIGNS = [
    { name: 'Capricorn', symbol: '♑', start: [12, 22], end: [1, 19] },
    { name: 'Aquarius',  symbol: '♒', start: [1,  20], end: [2, 18] },
    { name: 'Pisces',    symbol: '♓', start: [2,  19], end: [3, 20] },
    { name: 'Aries',     symbol: '♈', start: [3,  21], end: [4, 19] },
    { name: 'Taurus',    symbol: '♉', start: [4,  20], end: [5, 20] },
    { name: 'Gemini',    symbol: '♊', start: [5,  21], end: [6, 20] },
    { name: 'Cancer',    symbol: '♋', start: [6,  21], end: [7, 22] },
    { name: 'Leo',       symbol: '♌', start: [7,  23], end: [8, 22] },
    { name: 'Virgo',     symbol: '♍', start: [8,  23], end: [9, 22] },
    { name: 'Libra',     symbol: '♎', start: [9,  23], end: [10, 22] },
    { name: 'Scorpio',   symbol: '♏', start: [10, 23], end: [11, 21] },
    { name: 'Sagittarius',symbol:'♐', start: [11, 22], end: [12, 21] },
    { name: 'Capricorn', symbol: '♑', start: [12, 22], end: [12, 31] },
  ];

  const GENERATIONS = [
    { name: 'Silent Generation', start: 1928, end: 1945 },
    { name: 'Baby Boomer',       start: 1946, end: 1964 },
    { name: 'Generation X',      start: 1965, end: 1980 },
    { name: 'Millennial',        start: 1981, end: 1996 },
    { name: 'Generation Z',      start: 1997, end: 2012 },
    { name: 'Generation Alpha',  start: 2013, end: 2025 },
  ];

  const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTHS   = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];

  let _liveTimer = null;
  let _birthDate = null;

  const fmt = (n) => Math.floor(n).toLocaleString('en-US');

  function _validateInputs(day, month, year) {
    if (!day || !month || !year)
      return 'Please fill in all fields — day, month, and year.';

    if (isNaN(day) || isNaN(year))
      return 'Day and year must be valid numbers.';

    if (day < 1 || day > 31)
      return 'Day must be between 1 and 31.';

    if (month < 1 || month > 12)
      return 'Month must be between 1 and 12.';

    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear)
      return `Year must be between 1900 and ${currentYear}.`;

    // Validate actual date (handles month-end overflow, e.g. Feb 30)
    const testDate = new Date(year, month - 1, day);
    if (
      testDate.getFullYear() !== parseInt(year) ||
      testDate.getMonth()    !== parseInt(month) - 1 ||
      testDate.getDate()     !== parseInt(day)
    ) return `${day}/${month}/${year} is not a valid calendar date.`;

    if (testDate > new Date())
      return 'Birth date cannot be in the future.';

    return null;
  }

  function _computeAge(birthDate, now) {
    let years  = now.getFullYear() - birthDate.getFullYear();
    let months = now.getMonth()    - birthDate.getMonth();
    let days   = now.getDate()     - birthDate.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    return { years, months, days };
  }

  function _computeTotals(birthDate, now) {
    const diffMs = now - birthDate;
    const totalDays    = diffMs / (1000 * 60 * 60 * 24);
    const totalWeeks   = totalDays / 7;
    const totalMonths  = (now.getFullYear() - birthDate.getFullYear()) * 12 +
                         (now.getMonth() - birthDate.getMonth());
    const totalHours   = diffMs / (1000 * 60 * 60);
    const totalMinutes = diffMs / (1000 * 60);
    const totalSeconds = diffMs / 1000;

    return {
      totalDays,
      totalWeeks,
      totalMonths,
      totalHours,
      totalMinutes,
      totalSeconds,
    };
  }

  function _getNextBirthday(birthDate, now) {
    const bDay   = birthDate.getDate();
    const bMonth = birthDate.getMonth();

    let nextBirthday = new Date(now.getFullYear(), bMonth, bDay);
    if (nextBirthday <= now) {
      nextBirthday = new Date(now.getFullYear() + 1, bMonth, bDay);
    }

    const diffMs       = nextBirthday - now;
    const totalDaysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const monthsLeft   = Math.floor(totalDaysLeft / 30);
    const daysLeft     = totalDaysLeft % 30;

    return {
      date: nextBirthday,
      totalDaysLeft,
      monthsLeft,
      daysLeft,
      weekday: WEEKDAYS[nextBirthday.getDay()],
      formatted: `${bDay} ${MONTHS[bMonth]} ${nextBirthday.getFullYear()}`,
    };
  }

  function _getZodiac(day, month) {
    for (const z of ZODIAC_SIGNS) {
      const [sm, sd] = z.start;
      const [em, ed] = z.end;
      if ((month === sm && day >= sd) || (month === em && day <= ed)) {
        return z;
      }
    }
    return { name: 'Unknown', symbol: '✦' };
  }

  function _getGeneration(year) {
    return GENERATIONS.find(g => year >= g.start && year <= g.end)?.name
      || 'Generation Alpha+';
  }

  function _getLifeFacts(totalDays) {
    return {
      heartbeats : fmt(totalDays * 24 * 60 * 70),   // avg 70 bpm
      sleep      : fmt(totalDays * 0.33),             // ~8h/day = 33%
      meals      : fmt(totalDays * 3),                // 3 meals/day
      orbits     : (totalDays / 365.25).toFixed(2),   // earth orbits
    };
  }

  function _setError(msg) {
    const el = document.getElementById('error-msg');
    if (el) el.textContent = msg || '';
  }

  function _animateCount(el, targetValue, isFormatted = true) {
    if (!el) return;
    const duration = 700;
    const start    = performance.now();
    const from     = 0;
    const to       = parseFloat(targetValue.toString().replace(/,/g, ''));

    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = from + (to - from) * eased;

      el.textContent = isFormatted
        ? fmt(current)
        : current.toFixed(2);

      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

  /* ── DOM: Render all results ─────────────────────────────────── */
  function _renderResults(birthDate) {
    const now = new Date();

    // ─ Age ─
    const age = _computeAge(birthDate, now);
    _animateCount(document.getElementById('res-years'), age.years);
    document.getElementById('res-months').textContent = age.months;
    document.getElementById('res-days').textContent   = age.days;

    // ─ Totals ─
    const totals = _computeTotals(birthDate, now);
    _animateCount(document.getElementById('stat-total-months'),  totals.totalMonths);
    _animateCount(document.getElementById('stat-total-weeks'),   totals.totalWeeks);
    _animateCount(document.getElementById('stat-total-days'),    totals.totalDays);
    _animateCount(document.getElementById('stat-total-hours'),   totals.totalHours);
    _animateCount(document.getElementById('stat-total-minutes'), totals.totalMinutes);
    _animateCount(document.getElementById('stat-total-seconds'), totals.totalSeconds);

    // ─ Next Birthday ─
    const bday = _getNextBirthday(birthDate, now);
    const bdayEl   = document.getElementById('birthday-countdown');
    const bdayDate = document.getElementById('birthday-date');
    const bdayDay  = document.getElementById('birthday-weekday');

    if (bday.totalDaysLeft === 0) {
      bdayEl.textContent  = '🎉 TODAY IS YOUR BIRTHDAY!';
    } else if (bday.monthsLeft > 0) {
      bdayEl.textContent = `${bday.monthsLeft} month${bday.monthsLeft>1?'s':''}, ${bday.daysLeft} day${bday.daysLeft!==1?'s':''} away`;
    } else {
      bdayEl.textContent = `${bday.totalDaysLeft} day${bday.totalDaysLeft!==1?'s':''} away`;
    }
    bdayDate.textContent = bday.formatted;
    bdayDay.textContent  = bday.weekday.toUpperCase();

    // ─ Zodiac ─
    const zodiac = _getZodiac(birthDate.getDate(), birthDate.getMonth() + 1);
    document.getElementById('zodiac-symbol').textContent = zodiac.symbol;
    document.getElementById('zodiac-name').textContent   = zodiac.name;

    // ─ Generation ─
    document.getElementById('gen-name').textContent = _getGeneration(birthDate.getFullYear());

    // ─ Life Facts ─
    const facts = _getLifeFacts(totals.totalDays);
    document.getElementById('fact-heartbeats').textContent = facts.heartbeats;
    document.getElementById('fact-sleep').textContent      = facts.sleep;
    document.getElementById('fact-meals').textContent      = facts.meals;
    document.getElementById('fact-orbits').textContent     = facts.orbits;

    // ─ Show panel ─
    const panel = document.getElementById('results-panel');
    panel.classList.remove('hidden');

    // Scroll to results smoothly
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ── LIVE COUNTER: update every second ──────────────────────── */
  function _startLiveCounter(birthDate) {
    if (_liveTimer) clearInterval(_liveTimer);

    const liveEl = document.getElementById('live-seconds');
    if (!liveEl) return;

    const tick = () => {
      const now = new Date();
      const totalSeconds = Math.floor((now - birthDate) / 1000);
      liveEl.textContent = fmt(totalSeconds);
    };

    tick();
    _liveTimer = setInterval(tick, 1000);
  }

  /* ── PUBLIC: main calculate function ────────────────────────── */
  function calculate() {
    const day   = parseInt(document.getElementById('day')?.value);
    const month = parseInt(document.getElementById('month')?.value);
    const year  = parseInt(document.getElementById('year')?.value);

    // Validate
    const error = _validateInputs(day, month, year);
    if (error) {
      _setError(error);
      return;
    }
    _setError('');

    // Build birth date (month is 0-indexed in JS Date)
    _birthDate = new Date(year, month - 1, day);

    _renderResults(_birthDate);
    _startLiveCounter(_birthDate);
  }

  /* ── INIT: keyboard support + footer date ───────────────────── */
  function _init() {
    // Enter key triggers calculation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') calculate();
    });

    // Footer date
    const footerDate = document.getElementById('footer-date');
    if (footerDate) {
      const now = new Date();
      footerDate.textContent = `Today: ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
    }

    // Input sanitization — max 4 chars on year
    const yearInput = document.getElementById('year');
    if (yearInput) {
      yearInput.addEventListener('input', () => {
        if (yearInput.value.length > 4)
          yearInput.value = yearInput.value.slice(0, 4);
      });
    }

    // Day input max 2 digits
    const dayInput = document.getElementById('day');
    if (dayInput) {
      dayInput.addEventListener('input', () => {
        if (dayInput.value.length > 2)
          dayInput.value = dayInput.value.slice(0, 2);
      });
    }
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  /* ── PUBLIC API ──────────────────────────────────────────────── */
  return {
    calculate,
  };

})();
