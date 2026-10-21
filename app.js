const STORAGE_KEY = "taskflow-cards";
const defaultCards = [
  { id: crypto.randomUUID(), title: "Confirm project kickoff", assignee: "Alex Morgan", status: "todo" },
  { id: crypto.randomUUID(), title: "Draft the first sprint plan", assignee: "Jamie Chen", status: "in-progress" },
];

const dialog = document.querySelector("#card-dialog");
const form = document.querySelector("#card-form");
const titleInput = document.querySelector("#card-title");
const assigneeInput = document.querySelector("#card-assignee");
const statusInput = document.querySelector("#card-status");
const dialogTitle = document.querySelector("#dialog-title");
const template = document.querySelector("#card-template");
let cards = loadCards();
let editingId = null;

function loadCards() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : defaultCards;
  } catch {
    return defaultCards;
  }
}

function persistCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function render() {
  document.querySelectorAll("[data-list]").forEach((list) => {
    list.replaceChildren();
    const status = list.dataset.list;
    cards.filter((card) => card.status === status).forEach((card) => {
      const element = template.content.cloneNode(true);
      const article = element.querySelector(".task-card");
      article.dataset.id = card.id;
      article.querySelector("h3").textContent = card.title;
      article.querySelector(".assignee").textContent = card.assignee || "Unassigned";
      const moveSelect = article.querySelector(".move-card-select");
      moveSelect.value = card.status;
      article.querySelector(".edit-card-button").addEventListener("click", () => openDialog(card));
      moveSelect.addEventListener("change", (event) => moveCard(card.id, event.target.value));
      list.appendChild(element);
    });
    document.querySelector(`[data-count="${status}"]`).textContent = cards.filter((card) => card.status === status).length;
  });
}

function openDialog(card = null) {
  editingId = card?.id ?? null;
  dialogTitle.textContent = card ? "Edit card" : "Create a card";
  titleInput.value = card?.title ?? "";
  assigneeInput.value = card?.assignee ?? "";
  statusInput.value = card?.status ?? "todo";
  dialog.showModal();
  titleInput.focus();
}

function moveCard(id, status) {
  const card = cards.find((item) => item.id === id);
  if (!card) return;
  card.status = status;
  persistCards();
  render();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;
  const details = { title, assignee: assigneeInput.value, status: statusInput.value };
  if (editingId) {
    const card = cards.find((item) => item.id === editingId);
    if (card) Object.assign(card, details);
  } else {
    cards.push({ id: crypto.randomUUID(), ...details });
  }
  persistCards();
  render();
  dialog.close();
});

document.querySelector("#new-card-button").addEventListener("click", () => openDialog());
document.querySelector("#close-dialog-button").addEventListener("click", () => dialog.close());
document.querySelector("#cancel-dialog-button").addEventListener("click", () => dialog.close());
render();
