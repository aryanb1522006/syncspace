import { animate, stagger } from "animejs";
import "./styles.css";
import "./immersive.css";
import { getAccountCapabilities, getVisibleTeamContacts } from "./access-model.js";
import { createConstellationScene } from "./constellation-scene.js";

const demoAccount = {
  id: "user-isha",
  name: "Isha Mehta",
  email: "isha@northstar.edu",
};

const demoTeam = {
  id: "team-greengrid",
  name: "GreenGrid",
  owner: { id: "user-arjun", name: "Arjun Rao", email: "arjun@northstar.edu" },
  collaborators: [
    { id: "user-isha", name: "Isha Mehta", email: "isha@northstar.edu", status: "accepted" },
    { id: "user-kabir", name: "Kabir Shah", email: "kabir@northstar.edu", status: "pending" },
  ],
};

const landingView = document.querySelector("#landing-view");
const workspaceView = document.querySelector("#workspace-view");
const signInDialog = document.querySelector("#sign-in-dialog");
const signInForm = document.querySelector("#sign-in-form");
const actionDialog = document.querySelector("#action-dialog");
const actionDialogContent = document.querySelector("#action-dialog-content");
const contactRail = document.querySelector("#contact-rail");
const toast = document.querySelector("#toast");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let pendingIntent = "join";
let toastTimer;

const constellation = createConstellationScene(document.querySelector("#constellation-canvas"), {
  you: document.querySelector('[data-node-label="you"]'),
  join: document.querySelector('[data-node-label="join"]'),
  greenGrid: document.querySelector('[data-project-label="greenGrid"]'),
  studyCircle: document.querySelector('[data-project-label="studyCircle"]'),
  campusMobility: document.querySelector('[data-project-label="campusMobility"]'),
  openLab: document.querySelector('[data-project-label="openLab"]'),
  localLens: document.querySelector('[data-project-label="localLens"]'),
});

if (!reduceMotion) {
  animate("[data-animate='header']", {
    opacity: { from: 0 },
    y: { from: -14 },
    duration: 550,
    ease: "out(3)",
  });
  animate(".hero-copy > *", {
    opacity: { from: 0 },
    y: { from: 26 },
    delay: stagger(90),
    duration: 720,
    ease: "out(4)",
  });
  animate(".constellation-shell", {
    opacity: { from: 0 },
    scale: { from: 0.96 },
    delay: 150,
    duration: 1000,
    ease: "out(4)",
  });
  animate(".project-label", {
    opacity: { from: 0 },
    scale: { from: 0.88 },
    delay: stagger(85, { start: 520 }),
    duration: 680,
    ease: "out(4)",
  });
}

function syncSceneToScroll() {
  const hero = document.querySelector(".hero");
  const distance = Math.max(hero.offsetHeight * 0.82, 1);
  constellation.setScrollProgress(window.scrollY / distance);
}

window.addEventListener("scroll", syncSceneToScroll, { passive: true });
syncSceneToScroll();

function setupScrollReveals() {
  const targets = [...document.querySelectorAll("[data-scroll-reveal]")];

  if (reduceMotion || !("IntersectionObserver" in window)) {
    targets.forEach((target) => {
      target.dataset.revealState = "visible";
    });
    return;
  }

  const offsets = {
    left: { x: -54, y: 0 },
    right: { x: 54, y: 0 },
    up: { x: 0, y: 48 },
  };

  targets.forEach((target) => {
    target.style.opacity = "0";
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const offset = offsets[entry.target.dataset.scrollReveal] ?? offsets.up;
        entry.target.dataset.revealState = "visible";
        animate(entry.target, {
          opacity: 1,
          x: { from: offset.x },
          y: { from: offset.y },
          duration: 880,
          ease: "out(4)",
        });
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -10% 0px" },
  );

  targets.forEach((target) => observer.observe(target));
}

setupScrollReveals();

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  if (!reduceMotion) {
    animate(toast, { opacity: { from: 0 }, y: { from: 12 }, duration: 280, ease: "out(3)" });
  }
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2800);
}

function openSignIn(intent = "join") {
  pendingIntent = intent;
  signInDialog.showModal();
  window.setTimeout(() => signInDialog.querySelector("input")?.focus(), 0);
}

function showWorkspace() {
  const capabilities = getAccountCapabilities(demoAccount);
  document.querySelector('[data-open-action="post"]').disabled = !capabilities.canPost;
  document.querySelector('[data-open-action="join"]').disabled = !capabilities.canJoin;
  landingView.hidden = true;
  workspaceView.hidden = false;
  renderContacts();
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });

  if (!reduceMotion) {
    animate(".workspace-heading, .workspace-route, .team-contacts", {
      opacity: { from: 0 },
      y: { from: 22 },
      delay: stagger(75),
      duration: 620,
      ease: "out(4)",
    });
  }
}

function returnHome() {
  workspaceView.hidden = true;
  landingView.hidden = false;
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
}

function contactMarkup(contact, index) {
  const initials = contact.name.split(" ").map((part) => part[0]).join("");
  const emailMarkup = contact.email
    ? `<span class="contact-email">${contact.email}<button type="button" data-copy-email="${contact.email}" aria-label="Copy ${contact.name}'s email"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"></path></svg></button></span>`
    : `<span class="contact-email contact-email--hidden">Email hidden</span>`;

  return `<article class="rail-person">
    <span class="avatar ${index === 0 ? "avatar--lime" : "avatar--lavender"}">${initials}</span>
    <span><strong>${contact.name} · ${contact.role}</strong>${emailMarkup}</span>
  </article>`;
}

function renderContacts() {
  const contacts = getVisibleTeamContacts(demoTeam, demoAccount.id);
  contactRail.innerHTML = `
    <div class="rail-team"><span class="team-mark">GG</span><span><strong>${demoTeam.name}</strong><small>Accepted team</small></span></div>
    ${contacts.map(contactMarkup).join("")}
  `;
}

const actionViews = {
  post: `
    <div class="action-heading"><span class="modal-mark modal-mark--lime">P</span><div><h2 id="action-dialog-title">Post your idea</h2><p>Share a clear starting point for the collaborators you want to meet.</p></div></div>
    <form id="post-project-form" class="action-form">
      <label>Project title<input name="title" value="Campus Mobility Lab" required /></label>
      <label>One-line summary<textarea name="summary" required>Make campus travel safer using student-led route insights.</textarea></label>
      <button class="button button--primary button--full" type="submit">Save test draft</button>
    </form>`,
  join: `
    <div class="action-heading"><span class="modal-mark modal-mark--lavender">J</span><div><h2 id="action-dialog-title">Join a project</h2><p>Five sample teams exploring different domains.</p></div></div>
    <div class="project-options">
      <article><div><strong>GreenGrid</strong><span>React · Node.js · Climate Tech</span></div><button type="button" class="button button--small" data-apply="GreenGrid">Apply</button></article>
      <article><div><strong>StudyCircle</strong><span>React · PostgreSQL · EdTech</span></div><button type="button" class="button button--small" data-apply="StudyCircle">Apply</button></article>
      <article><div><strong>Campus Mobility</strong><span>TypeScript · Maps · Mobility</span></div><button type="button" class="button button--small" data-apply="Campus Mobility">Apply</button></article>
      <article><div><strong>OpenLab</strong><span>Python · Data · Research</span></div><button type="button" class="button button--small" data-apply="OpenLab">Apply</button></article>
      <article><div><strong>LocalLens</strong><span>Design · Storytelling · Community</span></div><button type="button" class="button button--small" data-apply="LocalLens">Apply</button></article>
    </div>`,
  workspace: `
    <div class="action-heading"><span class="modal-mark">SS</span><div><h2 id="action-dialog-title">Your SyncSpace</h2><p>Explore teams first, or post the idea you want to lead.</p></div></div>`,
};

function openAction(intent) {
  actionDialogContent.innerHTML = actionViews[intent] ?? actionViews.join;
  actionDialog.showModal();
}

document.querySelectorAll("[data-auth-intent]").forEach((button) => {
  button.addEventListener("click", () => openSignIn(button.dataset.authIntent));
});

signInForm.addEventListener("submit", (event) => {
  event.preventDefault();
  signInDialog.close();
  showWorkspace();
  window.setTimeout(() => openAction(pendingIntent), 420);
});

document.querySelectorAll("[data-return-home], [data-sign-out]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    returnHome();
  });
});

document.querySelectorAll("[data-open-action]").forEach((button) => {
  button.addEventListener("click", () => openAction(button.dataset.openAction));
});

document.querySelector("[data-close-action]").addEventListener("click", () => actionDialog.close());

actionDialog.addEventListener("click", (event) => {
  if (event.target === actionDialog) actionDialog.close();
  const applyButton = event.target.closest("[data-apply]");
  if (applyButton) {
    applyButton.textContent = "Applied";
    applyButton.disabled = true;
    showToast(`Test application sent to ${applyButton.dataset.apply}.`);
  }
});

actionDialog.addEventListener("submit", (event) => {
  if (event.target.id !== "post-project-form") return;
  event.preventDefault();
  actionDialog.close();
  showToast("Test project draft saved locally. No production data changed.");
});

contactRail.addEventListener("click", async (event) => {
  const copyButton = event.target.closest("[data-copy-email]");
  if (!copyButton) return;
  try {
    await navigator.clipboard.writeText(copyButton.dataset.copyEmail);
    showToast("Email copied.");
  } catch {
    showToast(copyButton.dataset.copyEmail);
  }
});

document.querySelectorAll("[data-workspace-nav]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-workspace-nav]").forEach((item) => item.classList.remove("is-selected"));
    button.classList.add("is-selected");
    showToast(`${button.dataset.workspaceNav} stays intentionally minimal in this landing-page test.`);
  });
});

document.querySelector("[data-view-team]").addEventListener("click", () => {
  showToast("The full team page is outside this UI experiment.");
});
