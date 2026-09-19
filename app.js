// app.js — all of the app's logic lives here.
//
// Roughly in order:
//   1. Supabase client setup
//   2. Element references + small helpers
//   3. Auth (sign up, log in, log out, session on reload)
//   4. Reminder CRUD (create, read, update, delete)
//   5. Rendering the list

// ---------------------------------------------------------------------------
// 1. Supabase client
// ---------------------------------------------------------------------------

// These come from the Supabase dashboard: Project Settings -> API.
//
// Yes, this key ends up publicly visible in the browser. That is expected:
// the publishable key (formerly called "anon public") is designed to be
// shipped to clients. It only grants what your Row Level Security policies
// allow, and the policies in schema.sql restrict every row to its owner.
//
// The *secret* key on that same dashboard page bypasses RLS entirely and must
// never appear here. See the README for more.
const SUPABASE_URL = "https://tvfzjrczhaceqswdfpvg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_DRC5TLMfAffIi2e4NT27mg__AaEJRQX";

// The CDN script in index.html gives us a global called `supabase`. We call
// its createClient() and keep the result in `db`, so the two names don't clash.
const db = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ---------------------------------------------------------------------------
// 2. Elements and helpers
// ---------------------------------------------------------------------------

const authView = document.getElementById("auth-view");
const appView = document.getElementById("app-view");
const authForm = document.getElementById("auth-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitBtn = document.getElementById("submit-btn");
const switchBtn = document.getElementById("switch-btn");
const switchPrompt = document.getElementById("switch-prompt");
const logoutBtn = document.getElementById("logout-btn");
const userEmail = document.getElementById("user-email");
const authMessage = document.getElementById("auth-message");

const reminderForm = document.getElementById("reminder-form");
const reminderText = document.getElementById("reminder-text");
const reminderDue = document.getElementById("reminder-due");
const reminderList = document.getElementById("reminder-list");
const emptyState = document.getElementById("empty-state");
const appMessage = document.getElementById("app-message");
const headlineCount = document.getElementById("headline-count");
const headlineSub = document.getElementById("headline-sub");
const emptyTitle = emptyState.querySelector(".empty-title");
const emptySub = emptyState.querySelector(".empty-sub");
const tabs = Array.from(document.querySelectorAll(".tab"));

// Show a message under a form. `isError` picks the colour.
function showMessage(element, text, isError = true) {
  element.textContent = text;
  element.classList.toggle("success", !isError);
}

function clearMessages() {
  showMessage(authMessage, "");
  showMessage(appMessage, "");
}

// Today as a plain YYYY-MM-DD string, in the browser's own timezone. Using
// local parts (not toISOString, which is UTC) means "today" means today here.
function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// Format "2026-03-04" as "4 Mar", or "4 Mar 2026" if it isn't this year.
// Dates come back from Postgres as plain YYYY-MM-DD strings, so we split them
// rather than using new Date(), which reads them as UTC midnight and can shift
// the day in some timezones.
function formatDueDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const thisYear = Number(todayIso().slice(0, 4));
  const suffix = year === thisYear ? "" : ` ${year}`;
  return `${day} ${monthNames[month - 1]}${suffix}`;
}

// "overdue", "today", or "" — drives the colour of the due-date pill.
// Comparing YYYY-MM-DD strings works because the format sorts like the date.
function dueState(isoDate) {
  const today = todayIso();
  if (isoDate < today) return "overdue";
  if (isoDate === today) return "today";
  return "";
}

// ---------------------------------------------------------------------------
// 3. Auth
// ---------------------------------------------------------------------------

// onAuthStateChange fires once when the page loads (with the stored session,
// if any) and again on every login/logout. Doing our view switching here means
// session persistence across reloads comes for free — the Supabase client
// keeps the session in localStorage and restores it for us.
db.auth.onAuthStateChange((_event, session) => {
  if (session) {
    showAppView(session.user);
  } else {
    showAuthView();
  }
});

function showAppView(user) {
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
  userEmail.textContent = user.email;
  clearMessages();
  loadReminders();
}

function showAuthView() {
  appView.classList.add("hidden");
  authView.classList.remove("hidden");
  reminderList.replaceChildren();
  emptyState.classList.add("hidden");
  allReminders = [];
  activeFilter = "todo";
  setAuthMode("login");
}

// The auth form does double duty. `authMode` decides which, and the labels
// and behaviour follow from it.
//
// We can't detect whether an email already has an account — Supabase won't
// tell the browser, so that nobody can probe for who is registered. So the
// user picks, rather than the app guessing.
let authMode = "login"; // or "signup"

function setAuthMode(mode) {
  authMode = mode;
  clearMessages();

  const isLogin = mode === "login";
  submitBtn.textContent = isLogin ? "Log in" : "Sign up";
  switchPrompt.textContent = isLogin ? "Need an account?" : "Already have an account?";
  switchBtn.textContent = isLogin ? "Sign up" : "Log in";

  // Tells the browser's password manager whether to offer a saved password
  // or generate a new one.
  passwordInput.autocomplete = isLogin ? "current-password" : "new-password";
}

switchBtn.addEventListener("click", () => {
  setAuthMode(authMode === "login" ? "signup" : "login");
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessages();

  const credentials = {
    email: emailInput.value,
    password: passwordInput.value,
  };

  if (authMode === "login") {
    const { error } = await db.auth.signInWithPassword(credentials);
    if (error) {
      showMessage(authMessage, error.message);
      return;
    }
    // No redraw needed: onAuthStateChange above handles the view switch.
  } else {
    const { data, error } = await db.auth.signUp(credentials);
    if (error) {
      showMessage(authMessage, error.message);
      return;
    }
    // With email confirmation switched on, signUp returns no session and the
    // user has to click the link in their inbox first.
    if (!data.session) {
      // Order matters: setAuthMode clears messages, so switch mode first.
      setAuthMode("login");
      showMessage(authMessage, "Check your email to confirm your account, then log in.", false);
    }
  }

  authForm.reset();
});

logoutBtn.addEventListener("click", async () => {
  await db.auth.signOut();
});

// ---------------------------------------------------------------------------
// 4. Reminder CRUD
// ---------------------------------------------------------------------------
//
// Note what these queries do NOT do: filter by user. They don't have to. The
// RLS policies in schema.sql make Postgres itself restrict every row to
// auth.uid(), so a "select all reminders" query returns only your own.

async function loadReminders() {
  const { data, error } = await db
    .from("reminders")
    .select("*")
    // Sort by due date, with undated reminders at the bottom, then newest
    // first within the same date.
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    showMessage(appMessage, `Could not load reminders: ${error.message}`);
    return;
  }

  // Keep the full set in memory so switching tabs is instant — no refetch.
  allReminders = data;
  renderReminders();
}

reminderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessages();

  const { error } = await db.from("reminders").insert({
    text: reminderText.value.trim(),
    // An empty date input gives "", but the column wants a date or null.
    due_date: reminderDue.value || null,
    // user_id is filled in by the column's default (auth.uid()) — see
    // schema.sql. The INSERT policy would reject any other value anyway.
  });

  if (error) {
    showMessage(appMessage, `Could not add reminder: ${error.message}`);
    return;
  }

  reminderForm.reset();
  loadReminders();
});

async function toggleComplete(id, isComplete) {
  const { error } = await db
    .from("reminders")
    .update({ is_complete: isComplete })
    .eq("id", id);

  if (error) {
    showMessage(appMessage, `Could not update reminder: ${error.message}`);
  }
  loadReminders();
}

async function deleteReminder(id) {
  const { error } = await db.from("reminders").delete().eq("id", id);

  if (error) {
    showMessage(appMessage, `Could not delete reminder: ${error.message}`);
  }
  loadReminders();
}

// ---------------------------------------------------------------------------
// 5. Rendering
// ---------------------------------------------------------------------------

// Every reminder the user has, and which tab is showing. The tabs filter this
// list in the browser rather than re-querying, so switching is instant.
let allReminders = [];
let activeFilter = "todo"; // "todo" | "done" | "all"

const FILTERS = {
  todo: {
    matches: (r) => !r.is_complete,
    emptyTitle: "Nothing to do",
    emptySub: "Add a reminder above, or check the Done tab.",
  },
  done: {
    matches: (r) => r.is_complete,
    emptyTitle: "Nothing completed yet",
    emptySub: "Tick something off and it will appear here.",
  },
  all: {
    matches: () => true,
    emptyTitle: "Nothing here yet",
    emptySub: "Add your first reminder above.",
  },
};

for (const tab of tabs) {
  tab.addEventListener("click", () => {
    activeFilter = tab.dataset.filter;
    renderReminders();
  });
}

function renderReminders() {
  const filter = FILTERS[activeFilter];
  const visible = allReminders.filter(filter.matches);

  reminderList.replaceChildren();
  for (const reminder of visible) {
    reminderList.append(buildReminderItem(reminder));
  }

  const isEmpty = visible.length === 0;
  reminderList.classList.toggle("hidden", isEmpty);
  emptyState.classList.toggle("hidden", !isEmpty);
  emptyTitle.textContent = filter.emptyTitle;
  emptySub.textContent = filter.emptySub;

  updateTabs();
  updateHeadline(allReminders);
}

// Highlight the active tab and show how many reminders sit behind each one.
function updateTabs() {
  const counts = {
    todo: allReminders.filter(FILTERS.todo.matches).length,
    done: allReminders.filter(FILTERS.done.matches).length,
    all: allReminders.length,
  };

  for (const tab of tabs) {
    const name = tab.dataset.filter;
    tab.setAttribute("aria-selected", String(name === activeFilter));
    tab.querySelector(".tab-count").textContent = counts[name];
  }
}

// A one-line summary above the list: how many are left, and how many of those
// are already late.
function updateHeadline(reminders) {
  const open = reminders.filter((r) => !r.is_complete);
  const overdue = open.filter((r) => r.due_date && dueState(r.due_date) === "overdue");

  if (reminders.length === 0) {
    headlineCount.textContent = "Your reminders";
    headlineSub.textContent = "";
    return;
  }

  headlineCount.textContent =
    open.length === 0 ? "All done" : `${open.length} to do`;

  const parts = [];
  if (overdue.length > 0) parts.push(`${overdue.length} overdue`);
  const done = reminders.length - open.length;
  if (done > 0) parts.push(`${done} complete`);
  headlineSub.textContent = parts.join(" · ");
}

// Build one <li>. We create elements and set .textContent rather than writing
// an HTML string — that way a reminder containing "<script>" is shown as text
// instead of being run as markup.
function buildReminderItem(reminder) {
  const item = document.createElement("li");
  if (reminder.is_complete) item.classList.add("complete");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = reminder.is_complete;
  checkbox.addEventListener("change", () => {
    toggleComplete(reminder.id, checkbox.checked);
  });

  const text = document.createElement("span");
  text.className = "reminder-text";
  text.textContent = reminder.text;

  item.append(checkbox, text);

  if (reminder.due_date) {
    const due = document.createElement("span");
    // e.g. "due today" or "due overdue" — the second class sets the colour.
    due.className = `due ${dueState(reminder.due_date)}`.trim();
    due.textContent = formatDueDate(reminder.due_date);
    item.append(due);
  }

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "btn-icon";
  remove.textContent = "\u00d7"; // multiplication sign, a tidier × than "x"
  remove.setAttribute("aria-label", `Delete "${reminder.text}"`);
  remove.addEventListener("click", () => deleteReminder(reminder.id));
  item.append(remove);

  return item;
}
