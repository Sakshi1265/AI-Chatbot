// ====== ELEMENTS ======
const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const clearBtn = document.getElementById("clear-btn");
const themeBtn = document.getElementById("theme-btn");

const HISTORY_KEY = "gemini_chat_history";
const THEME_KEY = "gemini_chat_theme";
const GREETING =
  "Namaste! Main Gemini AI chatbot hu. Aap mujhse kuch bhi pooch sakte ho. 😊";

// Conversation history (Gemini format)
let history = [];

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {}
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {}
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
}

function initTheme() {
  const saved = readStorage(THEME_KEY);
  const prefersDark =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
}

themeBtn.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  writeStorage(THEME_KEY, next);
});

function saveHistory() {
  writeStorage(HISTORY_KEY, JSON.stringify(history));
}

function loadHistory() {
  try {
    const parsed = JSON.parse(readStorage(HISTORY_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function escapeHTML(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatText(text) {
  let safe = escapeHTML(text);
  safe = safe.replace(/```(?:\w+)?\n?([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
  safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");
  safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return safe;
}

function addMessage(text, sender, isHTML = false) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (isHTML) {
    bubble.innerHTML = text;
  } else if (sender === "bot") {
    bubble.innerHTML = formatText(text);
  } else {
    bubble.textContent = text;
  }

  msg.appendChild(bubble);
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

function showTyping() {
  return addMessage(
    '<div class="typing"><span></span><span></span><span></span></div>',
    "bot",
    true
  );
}

// Saved history ko screen par dikhao
function renderChat() {
  chatBox.innerHTML = "";
  addMessage(GREETING, "bot");
  history.forEach((item) => {
    const text = item.parts.map((p) => p.text).join("");
    addMessage(text, item.role === "user" ? "user" : "bot");
  });
}

async function getGeminiReply(userText) {
  history.push({ role: "user", parts: [{ text: userText }] });

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request fail ho gayi.");
    }

    history.push({ role: "model", parts: [{ text: data.reply }] });
    saveHistory();
    return data.reply;
  } catch (err) {
    history.pop(); // fail hua to last message history se hata do
    throw err;
  }
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  userInput.value = "";
  sendBtn.disabled = true;
  userInput.disabled = true;

  const typingEl = showTyping();

  try {
    const reply = await getGeminiReply(text);
    typingEl.remove();
    addMessage(reply, "bot");
  } catch (err) {
    typingEl.remove();
    addMessage("Error: " + err.message, "error");
  } finally {
    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();
  }
});

clearBtn.addEventListener("click", () => {
  if (!confirm("Kya aap sach me poori chat delete karna chahte ho?")) return;
  history = [];
  removeStorage(HISTORY_KEY);
  renderChat();
});

initTheme();
history = loadHistory();
renderChat();