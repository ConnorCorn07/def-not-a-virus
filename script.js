const warnings = [
  { t: "⚠ SYSTEM WARNING", h: "YOUR COMPUTER IS INFECTED!", b: "A dangerous virus has been detected on this device.", d: "Threat: Trojan.Win32.TotallyReal" },
  { t: "⚠ SYSTEM WARNING", h: "ERROR: TOO MANY WARNINGS", b: "The warning system itself is now infected.", d: "Threat: Meta.Virus.Joke" },
  { t: "⚠ CRITICAL ALERT", h: "DO NOT CLOSE THIS WINDOW", b: "Closing this window will not help. It never helps.", d: "Threat: Win32.ClickMe" },
  { t: "⚠ FIREWALL FAILURE", h: "HACKERS ARE INSIDE", b: "A hacker in a hoodie is downloading your RAM.", d: "IP traced: 127.0.0.1 (very close)" },
  { t: "⚠ TROJAN WARNING", h: "47 VIRUSES FOUND", b: "Your computer has more viruses than a hospital.", d: "Threat: Adware.PopUpGenerator" },
  { t: "YOUR COMPUTER IS IN DANGER", h: "SYSTEM CRASH IMMINENT", b: "Your computer will crash in 3... 2... 1...", d: "Threat: System.Crash" },
  { t: " VIRUS ALERT", h: "YOUR FILES ARE ENCRYPTED", b: "All your files have been encrypted. Pay 1 Bitcoin to recover them.", d: "Threat: Ransomware.Locky" },
  { t: " SECURITY BREACH", h: "YOUR PASSWORDS ARE EXPOSED", b: "All your passwords have been sent to a hacker. Change them immediately.", d: "Threat: Credential.Theft" }
];
let popups = 0;
const MAX = 400;
let dragTarget = null, dragOffX = 0, dragOffY = 0;

const countEl = document.getElementById('count');
const levelEl = document.getElementById('level');
const tbIcons = document.querySelector('#taskbar .tb-icons');

//  Fake "lockdown" screen 
const LOCKDOWN_CHANCE = 0.05;   // 5% chance each time a popup spawns
const LOCKDOWN_MS = 8000;       // how long it stays up (set to 0 to keep it until "end the joke")
let lockdownEl = null;

// Random, obviously-not-real bitcoin-style address (random characters, no valid checksum)
const BECH32 = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
function fakeBtcAddress() {
  let a = 'bc1q';
  for (let i = 0; i < 38; i++) a += BECH32[Math.floor(Math.random() * BECH32.length)];
  return a;
}

function showLockdown() {
  if (lockdownEl) return; // only one at a time
  const el = document.createElement('div');
  el.id = 'lockdown';
  el.innerHTML =
    '<div class="lock-box">' +
    '<h1>⚠ SYSTEM LOCKDOWN ⚠</h1>' +
    '<p>Your ENTIRE PC will be locked down unless you pay <b>100 BTC</b> to the address below.</p>' +
    '<code>' + fakeBtcAddress() + '</code>' +
    '<p class="lock-small">(Just a prank. No payment needed. Hit "end the joke" to stop everything.)</p>' +
    '</div>';
  document.body.appendChild(el);
  lockdownEl = el;
  if (LOCKDOWN_MS > 0) {
    setTimeout(() => { if (lockdownEl === el) hideLockdown(); }, LOCKDOWN_MS);
  }
}

function hideLockdown() {
  if (lockdownEl) { lockdownEl.remove(); lockdownEl = null; }
}

//  Error sound 
// Leave null to use the built-in synthesized error "ding-dong".
// Or point it at your own file, e.g. 'error.wav' placed next to this script.
const ERROR_SOUND_FILE = null;
const SOUND_GAP_MS = 80;        // min gap between sounds so a burst of popups isn't deafening
let audioCtx = null;
let lastSoundAt = 0;

function getAudioCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  return audioCtx;
}

// Browsers block audio until the user interacts with the page, so unlock it on the first click/key
function unlockAudio() {
  const ctx = getAudioCtx();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}
document.addEventListener('click', unlockAudio);
document.addEventListener('keydown', unlockAudio);

function playErrorSound() {
  const now = performance.now();
  if (now - lastSoundAt < SOUND_GAP_MS) return;
  lastSoundAt = now;

  if (ERROR_SOUND_FILE) {
    const a = new Audio(ERROR_SOUND_FILE);
    a.volume = 0.5;
    a.play().catch(() => {}); // ignored if the browser still has audio blocked
    return;
  }

  const ctx = getAudioCtx();
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  // Two quick descending tones
  [[660, 0], [440, 0.12]].forEach(([freq, delay]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t + delay);
    gain.gain.exponentialRampToValueAtTime(0.18, t + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + delay);
    osc.stop(t + delay + 0.25);
  });
}

function updateHud() {
  countEl.textContent = popups;
  levelEl.textContent = Math.min(99, popups) + "%";
}

function spawnPopup() {
  if (popups >= MAX) return;
  if (Math.random() < LOCKDOWN_CHANCE) showLockdown();
  playErrorSound();
  const w = warnings[Math.floor(Math.random() * warnings.length)];
  const el = document.createElement('div');
  el.className = 'popup';
  const maxX = Math.max(0, window.innerWidth - 360);
  const maxY = Math.max(0, window.innerHeight - 230);
  el.style.left = Math.floor(Math.random() * maxX) + 'px';
  el.style.top = Math.floor(Math.random() * maxY) + 'px';
  el.style.zIndex = 10 + Math.floor(Math.random() * 500);
  el.innerHTML =
    '<div class="titlebar"><span>' + w.t + '</span><span class="x">✕</span></div>' +
    '<div class="body"><div class="icon">☠</div><div class="text"><b>' + w.h + '</b><br>' + w.b +
    '<div class="small">' + w.d + '</div></div></div>' +
    '<div class="footer"><button class="stop-btn">CLICK HERE TO STOP THE INFECTION</button></div>';

  // Every popup gets its own pin on the taskbar
  const pin = document.createElement('button');
  pin.className = 'tb-btn pin active';
  pin.textContent = '☠';
  pin.title = w.h;
  pin.addEventListener('click', () => { el.style.zIndex = 999; });
  tbIcons.appendChild(pin);

  // The big red button: closes this one... and spawns two more.
  el.querySelector('.stop-btn').addEventListener('click', () => {
    el.remove(); pin.remove(); popups--;
    spawnPopup(); spawnPopup(); spawnPopup();
    updateHud();
  });
  // The X button is worse. Obviously.
  el.querySelector('.x').addEventListener('click', () => {
    el.remove(); pin.remove(); popups--;
    spawnPopup(); spawnPopup(); spawnPopup(); spawnPopup(); spawnPopup(); spawnPopup(); spawnPopup(); spawnPopup();
    updateHud();
  });
  // Dragging by the titlebar
  const bar = el.querySelector('.titlebar');
  bar.addEventListener('mousedown', (e) => {
    dragTarget = el;
    dragOffX = e.clientX - el.offsetLeft;
    dragOffY = e.clientY - el.offsetTop;
    el.style.zIndex = 999;
  });

  document.body.appendChild(el);
  popups++;
}

document.addEventListener('mousemove', (e) => {
  if (!dragTarget) return;
  dragTarget.style.left = (e.clientX - dragOffX) + 'px';
  dragTarget.style.top = (e.clientY - dragOffY) + 'px';
});
document.addEventListener('mouseup', () => dragTarget = null);

// The mercy button: actually ends it.
document.getElementById('mercy').addEventListener('click', () => {
  document.querySelectorAll('.popup').forEach(p => p.remove());
  document.querySelectorAll('.pin').forEach(p => p.remove());
  hideLockdown();
  popups = 0; updateHud();
  document.querySelector('#desktop-msg h1').textContent = "It was a joke. Your computer is fine.";
  document.querySelector('#desktop-msg p').textContent = "It was always fine.";
});

spawnPopup();
updateHud();