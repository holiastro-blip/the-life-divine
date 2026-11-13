/**
 * THE LIFE DIVINE — Digital Companion & Audiobook Web Application
 * Art Direction: Forest & Parchment (#F0EBDD & #182C27)
 * Pure vanilla JavaScript with zero external dependencies.
 */

const SVG_ICONS = {
  play: `<svg class="icon-svg icon-play" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20"></polygon></svg>`,
  pause: `<svg class="icon-svg icon-pause" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="4.5" height="16" rx="0.5"></rect><rect x="14.5" y="4" width="4.5" height="16" rx="0.5"></rect></svg>`,
  chPlay: `<svg class="ch-play-svg" viewBox="0 0 24 24" fill="currentColor"><polygon points="8 5 19 12 8 19"></polygon></svg>`,
  playingWave: `<span class="sound-wave-anim"><span class="sw-bar"></span><span class="sw-bar"></span><span class="sw-bar"></span></span>`
};

class LifeDivineApp {
  constructor() {
    this.data = window.BOOK_DATA || { chapters: [] };
    this.chapters = this.data.chapters || [];
    
    // State
    this.currentView = 'home';
    this.currentAudioIndex = 0; // 0-based index (0 = Chapter 1)
    this.currentReaderIndex = 0;
    this.readerLayout = 'side-by-side';
    this.readerThemes = ['black', 'parchment', 'paper'];
    
    // Restore theme from localStorage if present
    const savedTheme = localStorage.getItem('life_divine_theme') || 'black';
    this.themeIndex = Math.max(0, this.readerThemes.indexOf(savedTheme));
    if (this.themeIndex === -1) this.themeIndex = 0;
    
    this.fontSize = parseInt(localStorage.getItem('life_divine_fontsize') || '20', 10);
    this.isPlaying = false;
    this.bookFilter = 'all';

    // Native Audio Engine
    this.audio = document.getElementById('native-audio');

    this.init();
  }

  init() {
    this.setupAudioListeners();
    this.setupKeyboardShortcuts();
    this.renderAudioSidebar();
    this.populateReaderDropdown();
    this.loadAudioChapter(0, false);
    this.loadReaderChapter(0);
    this.applyTheme(this.readerThemes[this.themeIndex]);
    this.applyFontSize();

    // Deep link or hash navigation on load
    const hash = (window.location.hash || '').toLowerCase();
    if (hash.includes('listen')) {
      this.showAudioView();
    } else if (hash.includes('read')) {
      this.showReadView();
    } else if (hash.includes('architectural-overview')) {
      this.showHome(true);
      setTimeout(() => {
        document.getElementById('architectural-overview')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }

  // =========================================================================
  // VIEW NAVIGATION & ROUTING
  // =========================================================================
  setNavPills(activeId) {
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById(activeId);
    if (btn) btn.classList.add('active');
  }

  showHome(skipScroll = false) {
    this.currentView = 'home';
    document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));
    const view = document.getElementById('view-home');
    if (view) view.classList.add('active');
    this.setNavPills('btn-mode-home');
    if (!skipScroll) {
      window.location.hash = 'overview';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  showAudioView(chIndex = null) {
    this.currentView = 'listen';
    document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));
    const view = document.getElementById('view-listen');
    if (view) view.classList.add('active');
    this.setNavPills('btn-mode-listen');
    window.location.hash = 'listen';
    if (chIndex !== null && chIndex !== this.currentAudioIndex) {
      this.loadAudioChapter(chIndex, true);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showReadView(chIndex = null) {
    this.currentView = 'read';
    document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));
    const view = document.getElementById('view-read');
    if (view) view.classList.add('active');
    this.setNavPills('btn-mode-read');
    window.location.hash = 'read';
    if (chIndex !== null) {
      this.loadReaderChapter(chIndex);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // =========================================================================
  // AUDIO ENGINE & PLAYBACK
  // =========================================================================
  setupAudioListeners() {
    this.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
    this.audio.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.updatePlayBtn();
    });
    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updatePlayBtn();
    });
    this.audio.addEventListener('ended', () => this.onTrackEnded());
  }

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;

      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlay();
      } else if (e.code === 'ArrowLeft') {
        this.skipSeconds(-10);
      } else if (e.code === 'ArrowRight') {
        this.skipSeconds(10);
      }
    });
  }

  renderAudioSidebar() {
    const listEl = document.getElementById('audio-chapter-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const query = (document.getElementById('audio-search')?.value || '').toLowerCase().trim();

    this.chapters.forEach((ch, idx) => {
      // Filter by book
      if (this.bookFilter === 1 && ch.book !== 1) return;
      if (this.bookFilter === 2 && ch.book !== 2) return;

      // Filter by query
      if (query) {
        const hay = `${ch.roman} ${ch.en_title} ${ch.kn_title} ${ch.book_label}`.toLowerCase();
        if (!hay.includes(query)) return;
      }

      const isCurrent = (idx === this.currentAudioIndex);
      const iconHtml = (isCurrent && this.isPlaying) ? SVG_ICONS.playingWave : SVG_ICONS.chPlay;

      const item = document.createElement('div');
      item.className = `ch-item ${isCurrent ? 'active' : ''}`;
      item.id = `sidebar-item-${idx}`;
      item.onclick = () => this.loadAudioChapter(idx, true);

      item.innerHTML = `
        <span class="ch-item-icon">${iconHtml}</span>
        <div class="ch-item-content">
          <div class="ch-item-meta">${ch.book_label} · CH. ${ch.roman}</div>
          <div class="ch-item-title">${ch.en_title}</div>
          <div class="ch-item-kn" lang="kn">${ch.kn_title}</div>
        </div>
      `;
      listEl.appendChild(item);
    });
  }

  filterBook(filterVal, btn) {
    this.bookFilter = filterVal;
    document.querySelectorAll('.l-filter').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this.renderAudioSidebar();
  }

  filterAudioChapters() {
    this.renderAudioSidebar();
  }

  loadAudioChapter(index, autoPlay = true) {
    if (index < 0 || index >= this.chapters.length) return;
    this.currentAudioIndex = index;
    const ch = this.chapters[index];

    // Update Meta
    const bookSubtitle = ch.book === 1 ? 'Book I — Omnipresent Reality and the Universe' :
                         (ch.part === 1 ? 'Book II · Part I — The Infinite Consciousness' : 'Book II · Part II — Spiritual Evolution');
    
    const npBook = document.getElementById('np-book');
    const npTitle = document.getElementById('np-title');
    const npKn = document.getElementById('np-kn');
    
    if (npBook) npBook.textContent = bookSubtitle;
    if (npTitle) npTitle.textContent = `Chapter ${ch.roman}: ${ch.en_title}`;
    if (npKn) npKn.textContent = ch.kn_title;

    // Update Audio Source
    this.audio.src = ch.audio_file;
    this.audio.playbackRate = parseFloat(document.getElementById('speed-select')?.value || '1.0');

    // Update Download Link
    const dlBtn = document.getElementById('btn-download-audio');
    if (dlBtn) {
      dlBtn.href = ch.audio_file;
      dlBtn.download = `The_Life_Divine_Ch_${ch.roman}.mp3`;
    }

    // Render Read-Along Text
    const bodyEl = document.getElementById('read-along-content');
    if (bodyEl) {
      bodyEl.innerHTML = ch.en_html;
    }

    // Update active highlight in sidebar
    document.querySelectorAll('.ch-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.getElementById(`sidebar-item-${index}`);
    if (activeEl) {
      activeEl.classList.add('active');
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    this.updatePlayBtn();

    if (autoPlay) {
      this.audio.play().catch(e => console.log('Autoplay deferred:', e));
    }
  }

  togglePlay() {
    if (this.audio.paused) {
      this.audio.play().catch(e => console.log('Playback error:', e));
    } else {
      this.audio.pause();
    }
  }

  updatePlayBtn() {
    const icon = document.getElementById('play-icon');
    if (icon) {
      icon.innerHTML = this.isPlaying ? SVG_ICONS.pause : SVG_ICONS.play;
    }

    // Update sidebar icon
    const activeSidebarIcon = document.querySelector(`.ch-item.active .ch-item-icon`);
    if (activeSidebarIcon) {
      activeSidebarIcon.innerHTML = this.isPlaying ? SVG_ICONS.playingWave : SVG_ICONS.chPlay;
    }
  }

  skipSeconds(sec) {
    this.audio.currentTime = Math.max(0, Math.min(this.audio.duration || 0, this.audio.currentTime + sec));
  }

  prevChapter() {
    if (this.currentAudioIndex > 0) {
      this.loadAudioChapter(this.currentAudioIndex - 1, true);
    }
  }

  nextChapter() {
    if (this.currentAudioIndex < this.chapters.length - 1) {
      this.loadAudioChapter(this.currentAudioIndex + 1, true);
    }
  }

  setSpeed(val) {
    this.audio.playbackRate = parseFloat(val);
  }

  seekAudio(e) {
    const wrap = document.getElementById('progress-wrap');
    if (!wrap || !this.audio.duration) return;
    const rect = wrap.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    this.audio.currentTime = pos * this.audio.duration;
  }

  onTimeUpdate() {
    const cur = this.audio.currentTime || 0;
    const dur = this.audio.duration || 1;
    const pct = (cur / dur) * 100;

    const bar = document.getElementById('progress-bar');
    if (bar) bar.style.width = `${pct}%`;

    const curLabel = document.getElementById('time-current');
    if (curLabel) curLabel.textContent = this.formatTime(cur);
  }

  onLoadedMetadata() {
    const durLabel = document.getElementById('time-duration');
    if (durLabel) durLabel.textContent = this.formatTime(this.audio.duration);
  }

  onTrackEnded() {
    const autoAdvance = document.getElementById('auto-advance')?.checked;
    if (autoAdvance && this.currentAudioIndex < this.chapters.length - 1) {
      this.nextChapter();
    }
  }

  formatTime(sec) {
    if (isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  jumpToKannadaReader() {
    this.showReadView(this.currentAudioIndex);
    this.setReaderLayout('kn-only');
  }

  // =========================================================================
  // 3. DIGITAL READER ENGINE
  // =========================================================================
  populateReaderDropdown() {
    const sel = document.getElementById('reader-ch-select');
    if (!sel) return;
    sel.innerHTML = '';
    this.chapters.forEach((ch, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${ch.book_label} · Ch. ${ch.roman}: ${ch.en_title}`;
      sel.appendChild(opt);
    });
  }

  loadReaderChapter(index) {
    this.currentReaderIndex = parseInt(index, 10);
    const ch = this.chapters[this.currentReaderIndex];
    if (!ch) return;

    // Update select dropdown
    const sel = document.getElementById('reader-ch-select');
    if (sel) sel.value = this.currentReaderIndex;

    // Progress indicator
    const prog = document.getElementById('reader-progress-indicator');
    if (prog) prog.textContent = `Chapter ${this.currentReaderIndex + 1} of ${this.chapters.length}`;

    // Render Stage
    const stage = document.getElementById('reader-stage');
    if (!stage) return;

    stage.className = `reading-stage layout-${this.readerLayout}`;

    if (this.readerLayout === 'side-by-side') {
      stage.innerHTML = `
        <article class="reader-article lang-en">
          <header class="ra-header">
            <div class="ra-meta-row">
              <span class="ra-eyebrow">${ch.book_label} · CH. ${ch.roman}</span>
              <span class="ra-pill">ENGLISH SYNTHESIS</span>
            </div>
            <h1 class="ra-title">${ch.en_title}</h1>
            <div class="ra-title-counterpart">${ch.kn_title}</div>
          </header>
          <div class="ra-body">${ch.en_html}</div>
        </article>

        <article class="reader-article lang-kn">
          <header class="ra-header">
            <div class="ra-meta-row">
              <span class="ra-eyebrow">${ch.book_label} · ಅಧ್ಯಾಯ ${ch.roman}</span>
              <span class="ra-pill">ಕನ್ನಡ ಅನುವಾದ</span>
            </div>
            <h1 class="ra-title" lang="kn">${ch.kn_title}</h1>
            <div class="ra-title-counterpart">${ch.en_title}</div>
          </header>
          <div class="ra-body" lang="kn">${ch.kn_html}</div>
        </article>
      `;
    } else if (this.readerLayout === 'alternating') {
      stage.innerHTML = `
        <article class="reader-article lang-en">
          <header class="ra-header">
            <div class="ra-meta-row">
              <span class="ra-eyebrow">${ch.book_label} · CHAPTER ${ch.roman}</span>
              <span class="ra-pill">ENGLISH SYNTHESIS</span>
            </div>
            <h1 class="ra-title">${ch.en_title}</h1>
            <div class="ra-title-counterpart">${ch.kn_title}</div>
          </header>
          <div class="ra-body">${ch.en_html}</div>
        </article>

        <article class="reader-article lang-kn">
          <header class="ra-header">
            <div class="ra-meta-row">
              <span class="ra-eyebrow">${ch.book_label} · ಅಧ್ಯಾಯ ${ch.roman}</span>
              <span class="ra-pill">ಕನ್ನಡ ಅನುವಾದ</span>
            </div>
            <h1 class="ra-title" lang="kn">${ch.kn_title}</h1>
            <div class="ra-title-counterpart">${ch.en_title}</div>
          </header>
          <div class="ra-body" lang="kn">${ch.kn_html}</div>
        </article>
      `;
    } else if (this.readerLayout === 'en-only') {
      stage.innerHTML = `
        <article class="reader-article lang-en">
          <header class="ra-header">
            <div class="ra-meta-row">
              <span class="ra-eyebrow">${ch.book_label} · CHAPTER ${ch.roman}</span>
              <span class="ra-pill">ENGLISH SYNTHESIS</span>
            </div>
            <h1 class="ra-title">${ch.en_title}</h1>
            <div class="ra-title-counterpart">${ch.kn_title}</div>
          </header>
          <div class="ra-body">${ch.en_html}</div>
        </article>
      `;
    } else if (this.readerLayout === 'kn-only') {
      stage.innerHTML = `
        <article class="reader-article lang-kn">
          <header class="ra-header">
            <div class="ra-meta-row">
              <span class="ra-eyebrow">${ch.book_label} · ಅಧ್ಯಾಯ ${ch.roman}</span>
              <span class="ra-pill">ಕನ್ನಡ ಅನುವಾದ</span>
            </div>
            <h1 class="ra-title" lang="kn">${ch.kn_title}</h1>
            <div class="ra-title-counterpart">${ch.en_title}</div>
          </header>
          <div class="ra-body" lang="kn">${ch.kn_html}</div>
        </article>
      `;
    }

    window.scrollTo({ top: 100, behavior: 'smooth' });
  }

  setReaderLayout(layout, btn = null) {
    this.readerLayout = layout;
    if (btn) {
      document.querySelectorAll('.lt-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    this.loadReaderChapter(this.currentReaderIndex);
  }

  prevReaderChapter() {
    if (this.currentReaderIndex > 0) {
      this.loadReaderChapter(this.currentReaderIndex - 1);
    }
  }

  nextReaderChapter() {
    if (this.currentReaderIndex < this.chapters.length - 1) {
      this.loadReaderChapter(this.currentReaderIndex + 1);
    }
  }

  cycleReaderTheme() {
    this.themeIndex = (this.themeIndex + 1) % this.readerThemes.length;
    const theme = this.readerThemes[this.themeIndex];
    this.applyTheme(theme);
    localStorage.setItem('life_divine_theme', theme);
  }

  applyTheme(theme) {
    document.body.className = `theme-${theme}`;
    const lbl = document.getElementById('lbl-theme-name');
    if (lbl) {
      const names = {
        black: 'Black',
        parchment: 'Parchment',
        paper: 'Archival Paper'
      };
      lbl.textContent = names[theme] || (theme.charAt(0).toUpperCase() + theme.slice(1));
    }
  }

  adjustFontSize(delta) {
    this.fontSize = Math.max(16, Math.min(26, this.fontSize + delta));
    this.applyFontSize();
    localStorage.setItem('life_divine_fontsize', this.fontSize.toString());
  }

  applyFontSize() {
    document.documentElement.style.setProperty('--reader-font-size', `${this.fontSize}px`);
  }

  jumpToAudioForCurrentChapter() {
    this.showAudioView(this.currentReaderIndex);
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new LifeDivineApp();
});
