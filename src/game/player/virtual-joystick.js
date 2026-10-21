import { GameState } from '../run/run-state.js';

/** Convert drag distance into bounded, dead-zone-adjusted analog movement. */
export function joystickVector(dx, dy, radius, deadzone, result) {
  const distance = Math.hypot(dx, dy);
  const limit = Math.min(distance, radius);
  result.offsetX = distance ? dx / distance * limit : 0;
  result.offsetY = distance ? dy / distance * limit : 0;
  const strength = radius > deadzone ? Math.max(0, (limit - deadzone) / (radius - deadzone)) : 0;
  result.x = distance ? dx / distance * strength : 0;
  result.y = distance ? dy / distance * strength : 0;
  return result;
}

export class VirtualJoystick {
  constructor(parent, deadzone) {
    this.deadzone = deadzone;
    this.vector = { x: 0, y: 0, offsetX: 0, offsetY: 0 };
    this.pointerId = null;
    this.state = GameState.READY;
    this.forced = false;
    this.media = window.matchMedia('(any-pointer: coarse)');
    this.element = document.createElement('div');
    this.element.className = 'virtual-joystick';
    this.element.setAttribute('role', 'group');
    this.element.setAttribute('aria-label', 'Movement joystick: drag to move');
    this.thumb = document.createElement('span');
    this.thumb.className = 'virtual-joystick-thumb';
    this.thumb.setAttribute('aria-hidden', 'true');
    this.element.append(this.thumb);
    parent.append(this.element);
    this.listeners = new AbortController();
    const options = { signal: this.listeners.signal };
    this.element.addEventListener('pointerdown', event => {
      event.preventDefault(); event.stopPropagation();
      if (!this.enabled || this.pointerId !== null) return;
      const rect = this.element.getBoundingClientRect();
      this.centerX = rect.left + rect.width / 2;
      this.centerY = rect.top + rect.height / 2;
      this.radius = Math.max(1, rect.width / 2 - this.thumb.offsetWidth / 2);
      this.pointerId = event.pointerId;
      this.element.setPointerCapture(event.pointerId);
      this.move(event);
    }, options);
    this.element.addEventListener('pointermove', event => this.move(event), options);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this.element.addEventListener(type, event => {
        if (event.pointerId !== this.pointerId) return;
        event.preventDefault(); event.stopPropagation(); this.clear();
      }, options);
    }
    window.addEventListener('blur', () => this.clear(), options);
    window.addEventListener('resize', () => this.clear(), options);
    this.onMediaChange = () => this.setState(this.state);
    this.media.addEventListener('change', this.onMediaChange);
    this.setState(this.state);
  }
  get enabled() { return this.state === GameState.IN_GAME && (this.forced || this.media.matches); }
  setForced(forced) {
    this.forced = Boolean(forced);
    this.setState(this.state);
  }
  setState(state) {
    this.state = state;
    this.element.hidden = !this.enabled;
    this.clear();
  }
  move(event) {
    if (event.pointerId !== this.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    joystickVector(event.clientX - this.centerX, event.clientY - this.centerY, this.radius, this.deadzone, this.vector);
    this.thumb.style.transform = `translate(${this.vector.offsetX}px, ${this.vector.offsetY}px)`;
  }
  clear() {
    const id = this.pointerId;
    this.pointerId = null;
    if (id !== null && this.element.hasPointerCapture(id)) this.element.releasePointerCapture(id);
    this.vector.x = this.vector.y = this.vector.offsetX = this.vector.offsetY = 0;
    this.thumb.style.transform = 'translate(0, 0)';
  }
  destroy() {
    this.clear();
    this.listeners.abort();
    this.media.removeEventListener('change', this.onMediaChange);
    this.element.remove();
  }
}
