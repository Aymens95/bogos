const { LOOP_MODES } = require("../utils/constants");

class MusicQueue {
  constructor() {
    this.songs = [];
    this.currentIndex = 0;
    this.history = [];
    this.loopMode = LOOP_MODES.OFF;
    this.autoplay = false;
    this.autoplayCount = 0;
    this.volume = 50;
    this.nowPlayingMessage = null;
    this.textChannel = null;
    this.disconnectMessage = null;
  }

  add(song) {
    if (!song?.autoplay) this.autoplayCount = 0;
    this.songs.push(song);
  }

  addMany(songs) {
    if (songs.some((song) => !song?.autoplay)) this.autoplayCount = 0;
    this.songs.push(...songs);
  }

  remove(index) {
    if (index < 0 || index >= this.songs.length) return null;
    const [removed] = this.songs.splice(index, 1);
    if (index < this.currentIndex) this.currentIndex -= 1;
    if (this.currentIndex >= this.songs.length) this.currentIndex = Math.max(0, this.songs.length - 1);
    return removed;
  }

  clear() {
    this.songs = [];
    this.currentIndex = 0;
    this.history = [];
  }

  shuffle() {
    const current = this.getCurrent();
    if (!current || this.songs.length <= 1) return false;

    const upcoming = this.songs.slice(this.currentIndex + 1);
    if (upcoming.length <= 1) return false;

    for (let i = upcoming.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [upcoming[i], upcoming[j]] = [upcoming[j], upcoming[i]];
    }

    this.songs = [current, ...upcoming];
    this.currentIndex = 0;
    return true;
  }

  move(from, to) {
    if (from < 0 || from >= this.songs.length || to < 0 || to >= this.songs.length) return false;
    const current = this.getCurrent();
    const [song] = this.songs.splice(from, 1);
    this.songs.splice(to, 0, song);
    this.currentIndex = current ? this.songs.indexOf(current) : 0;
    return true;
  }

  getCurrent() {
    return this.songs[this.currentIndex] || null;
  }

  getNext() {
    return this.songs[this.currentIndex + 1] || null;
  }

  getPrevious() {
    return this.history[this.history.length - 1] || null;
  }

  getAll() {
    return [...this.songs];
  }

  getPage(pageNumber) {
    const page = Math.max(1, pageNumber);
    const start = (page - 1) * 25;
    return this.songs.slice(start, start + 25).map((song, offset) => ({
      ...song,
      position: start + offset + 1
    }));
  }

  getTotalPages() {
    return Math.max(1, Math.ceil(this.songs.length / 25));
  }

  advance() {
    const current = this.getCurrent();
    if (current) this.history.push(current);

    if (this.loopMode === LOOP_MODES.SONG) return this.currentIndex;
    if (this.currentIndex + 1 < this.songs.length) {
      this.currentIndex += 1;
      return this.currentIndex;
    }

    if (this.loopMode === LOOP_MODES.QUEUE && this.songs.length > 0) {
      this.currentIndex = 0;
      return this.currentIndex;
    }

    return null;
  }

  jumpTo(index) {
    if (index < 0 || index >= this.songs.length) return false;
    const current = this.getCurrent();
    if (current) this.history.push(current);
    this.currentIndex = index;
    return true;
  }
}

module.exports = {
  MusicQueue
};
