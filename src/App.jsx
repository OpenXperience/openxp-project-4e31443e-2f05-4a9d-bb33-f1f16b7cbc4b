import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "taskflow-cards";
const CHANNEL_NAME = "taskflow-board";
const statuses = [
  { id: "todo", label: "To Do" },
  { id: "in-progress", label: "In Progress" },
  { id: "done", label: "Done" },
];
const assignees = ["Alex Morgan", "Jamie Chen", "Priya Shah", "Sam Rivera", "Taylor Kim"];
const initialCards = [
  { id: "kickoff", title: "Confirm project kickoff", assignee: "Alex Morgan", status: "todo" },
  { id: "sprint-plan", title: "Draft the first sprint plan", assignee: "Jamie Chen", status: "in-progress" },
];

function readCards() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : initialCards;
  } catch {
    return initialCards;
  }
}

function readSharedCards() {
  return readCards();
}

function writeSharedCards(cards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function updateSharedCards(update) {
  const latestCards = readSharedCards();
  const nextCards = update(latestCards);
  writeSharedCards(nextCards);
  return nextCards;
}

function CardDialog({ card, onClose, onSave }) {
  const [title, setTitle] = useState(card?.title ?? "");
  const [assignee, setAssignee] = useState(card?.assignee ?? "");
  const [status, setStatus] = useState(card?.status ?? "todo");

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onSave({ title: trimmedTitle, assignee, status });
  }

  return (
    <dialog open aria-labelledby="dialog-title" onCancel={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="dialog-header">
          <div>
            <p className="eyebrow">Task card</p>
            <h2 id="dialog-title">{card ? "Edit card" : "Create a card"}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}>×</button>
        </div>
        <label htmlFor="card-title">Title</label>
        <input id="card-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} autoFocus required />
        <label htmlFor="card-assignee">Assigned to</label>
        <select id="card-assignee" value={assignee} onChange={(event) => setAssignee(event.target.value)}>
          <option value="">Unassigned</option>
          {assignees.map((name) => <option key={name}>{name}</option>)}
        </select>
        <label htmlFor="card-status">Column</label>
        <select id="card-status" value={status} onChange={(event) => setStatus(event.target.value)}>
          {statuses.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
        </select>
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" type="submit">Save card</button>
        </div>
      </form>
    </dialog>
  );
}

function TaskCard({ card, onEdit, onMove }) {
  return (
    <article className="task-card">
      <div className="task-card-content">
        <h3>{card.title}</h3>
        <p className="assignee">{card.assignee || "Unassigned"}</p>
      </div>
      <div className="task-card-actions">
        <button className="text-button" type="button" onClick={() => onEdit(card)}>Edit</button>
        <label className="move-control">
          <span className="sr-only">Move card</span>
          <select aria-label="Move card" value={card.status} onChange={(event) => onMove(card.id, event.target.value)}>
            {statuses.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
          </select>
        </label>
      </div>
    </article>
  );
}

export default function App() {
  const [cards, setCards] = useState(readCards);
  const [editingCard, setEditingCard] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const channelRef = useRef(null);

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        setCards(JSON.parse(event.newValue));
      }
    };

    window.addEventListener("storage", handleStorageChange);
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;
      channel.addEventListener("message", ({ data }) => {
        if (data?.type === "cards-updated" && Array.isArray(data.cards)) {
          setCards(data.cards);
        }
      });
      return () => {
        window.removeEventListener("storage", handleStorageChange);
        channel.close();
      };
    }

    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  function publishCards(nextCards) {
    setCards(nextCards);
    channelRef.current?.postMessage({ type: "cards-updated", cards: nextCards });
  }

  function saveCard(details) {
    const nextCards = updateSharedCards((current) => editingCard
      ? current.map((card) => card.id === editingCard.id ? { ...card, ...details } : card)
      : [...current, { id: crypto.randomUUID(), ...details }]);
    publishCards(nextCards);
    setEditingCard(null);
    setIsCreating(false);
  }

  function moveCard(id, status) {
    const nextCards = updateSharedCards((current) =>
      current.map((card) => card.id === id ? { ...card, status } : card),
    );
    publishCards(nextCards);
  }

  function closeDialog() {
    setEditingCard(null);
    setIsCreating(false);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Meridian Labs</p>
          <h1>TaskFlow</h1>
          <p className="subtitle">Keep the team’s work moving.</p>
        </div>
        <div className="header-actions">
          <span className="sync-status"><span aria-hidden="true">●</span> Live sync on</span>
          <button className="primary-button" type="button" onClick={() => setIsCreating(true)}>+ New card</button>
        </div>
      </header>
      <section className="board" aria-label="Task board">
        {statuses.map((column) => {
          const columnCards = cards.filter((card) => card.status === column.id);
          return (
            <div className="board-column" key={column.id}>
              <div className="column-heading">
                <h2>{column.label}</h2>
                <span className="count">{columnCards.length}</span>
              </div>
              <div className="card-list">
                {columnCards.map((card) => <TaskCard key={card.id} card={card} onEdit={setEditingCard} onMove={moveCard} />)}
              </div>
            </div>
          );
        })}
      </section>
      {(isCreating || editingCard) && <CardDialog card={editingCard} onClose={closeDialog} onSave={saveCard} />}
    </main>
  );
}
