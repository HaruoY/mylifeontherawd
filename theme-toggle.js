/**
 * Theme toggle (dark / light) — My life on the rawd
 *
 * Funziona iniettando uno stylesheet di override quando il tema è "light",
 * così non serve modificare il <style> esistente di ogni pagina.
 * Ricorda la scelta in localStorage e inserisce da solo il pulsante toggle
 * nell'header (cercando il <nav> esistente).
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'rawd-theme';
  var LIGHT_STYLE_ID = 'rawd-light-theme';

  // Palette chiara — stessa struttura della palette scura usata nel sito
  var LIGHT_CSS = `
    :root {
      --bg: #F5F1E8;
      --surface: #EAE4D6;
      --ink: #1C1A17;
      --muted: #6B665F;
      --accent: #C8102E;
      --line: #D8D1C2;
    }
    header {
      background: linear-gradient(to bottom, rgba(245,241,232,0.92), rgba(245,241,232,0));
    }
    .trip-card, .gear-item, .empty-state {
      border-color: var(--line);
    }
    .trip-card img, .museum-work img {
      filter: grayscale(100%) contrast(1.05) brightness(1);
    }
    .hero::after {
      background: linear-gradient(to top, var(--bg), transparent);
    }
    .theme-toggle {
      border-color: var(--line);
      color: var(--ink);
    }
  `;

  function applyTheme(theme) {
    var existing = document.getElementById(LIGHT_STYLE_ID);
    if (theme === 'light') {
      if (!existing) {
        var styleTag = document.createElement('style');
        styleTag.id = LIGHT_STYLE_ID;
        styleTag.textContent = LIGHT_CSS;
        document.head.appendChild(styleTag);
      }
    } else if (existing) {
      existing.remove();
    }
    document.documentElement.setAttribute('data-theme', theme);
    updateToggleLabel(theme);
  }

  function getStoredTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'dark';
  }

  function setStoredTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      // localStorage non disponibile (modalità privata, ecc.) — il toggle
      // funziona comunque per la sessione corrente, solo senza persistenza.
    }
  }

  function updateToggleLabel(theme) {
    var btn = document.getElementById('rawd-theme-toggle');
    if (btn) {
      btn.textContent = theme === 'light' ? 'Dark' : 'Light';
      btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    }
  }

  function injectToggleButton() {
    var nav = document.querySelector('header nav');
    if (!nav || document.getElementById('rawd-theme-toggle')) return;

    var btn = document.createElement('button');
    btn.id = 'rawd-theme-toggle';
    btn.className = 'theme-toggle';
    btn.type = 'button';
    btn.style.cssText = [
      'background: transparent',
      'border: 1px solid currentColor',
      'border-radius: 3px',
      'padding: 6px 12px',
      'font-family: Inter, sans-serif',
      'font-size: 0.7rem',
      'letter-spacing: 0.06em',
      'text-transform: uppercase',
      'cursor: pointer',
      'opacity: 0.85'
    ].join(';');

    btn.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme') || 'dark';
      var next = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
      setStoredTheme(next);
    });

    nav.appendChild(btn);
  }

  // Applica subito il tema salvato (prima del rendering visibile, per evitare flash)
  var initialTheme = getStoredTheme();
  if (initialTheme === 'light') {
    var earlyStyle = document.createElement('style');
    earlyStyle.id = LIGHT_STYLE_ID;
    earlyStyle.textContent = LIGHT_CSS;
    document.head.appendChild(earlyStyle);
    document.documentElement.setAttribute('data-theme', 'light');
  }

  document.addEventListener('DOMContentLoaded', function () {
    injectToggleButton();
    updateToggleLabel(initialTheme);
  });
})();
