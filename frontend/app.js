// IMPORTANT: Change this to your Render URL after deploying backend!
const API_URL = "http://localhost:5000/api";

let isLoginMode = true;
let allSnippets = [];

// DOM Elements
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const userInfo = document.getElementById("user-info");
const welcomeText = document.getElementById("welcome-text");

const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authMessage = document.getElementById("auth-message");
const toggleAuthLink = document.getElementById("toggle-auth");
const switchPrompt = document.getElementById("switch-prompt");

const snippetForm = document.getElementById("snippet-form");
const snippetsList = document.getElementById("snippets-list");
const filterLanguage = document.getElementById("filter-language");

// Check if user is already logged in when page loads
window.onload = function () {
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");
  if (token && username) {
    showDashboard(username);
  }
};

// Switch between Login and Register form
toggleAuthLink.addEventListener("click", function (e) {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  authMessage.textContent = "";

  if (isLoginMode) {
    authTitle.textContent = "Login to Your Vault";
    authSubmitBtn.textContent = "Login";
    switchPrompt.textContent = "Don't have an account?";
    toggleAuthLink.textContent = "Register here";
  } else {
    authTitle.textContent = "Create New Account";
    authSubmitBtn.textContent = "Register";
    switchPrompt.textContent = "Already have an account?";
    toggleAuthLink.textContent = "Login here";
  }
});

// Handle Login or Register Submit
authForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const endpoint = isLoginMode ? "/login" : "/register";

  try {
    const response = await fetch(API_URL + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      authMessage.style.color = "#dc2626";
      authMessage.textContent = data.message;
      return;
    }

    if (isLoginMode) {
      // Save JWT token and username in browser localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
      showDashboard(data.username);
    } else {
      // Registration succeeded -> switch to login mode
      authMessage.style.color = "#059669";
      authMessage.textContent = data.message;
      isLoginMode = true;
      authTitle.textContent = "Login to Your Vault";
      authSubmitBtn.textContent = "Login";
    }
    authForm.reset();
  } catch (error) {
    authMessage.textContent = "Cannot connect to server.";
  }
});

// Show Dashboard and load snippets
function showDashboard(username) {
  authSection.classList.add("hidden");
  appSection.classList.remove("hidden");
  userInfo.classList.remove("hidden");
  welcomeText.textContent = "Hello, " + username + " ";
  loadSnippets();
}

// Logout button
document.getElementById("logout-btn").addEventListener("click", function () {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  authSection.classList.remove("hidden");
  appSection.classList.add("hidden");
  userInfo.classList.add("hidden");
});

// READ: Fetch snippets from backend
async function loadSnippets() {
  const token = localStorage.getItem("token");
  const response = await fetch(API_URL + "/snippets", {
    headers: { Authorization: "Bearer " + token }
  });
  allSnippets = await response.json();
  displaySnippets(allSnippets);
}

// Render snippets dynamically on the webpage
function displaySnippets(snippets) {
  snippetsList.innerHTML = "";

  if (snippets.length === 0) {
    snippetsList.innerHTML = "<p>No code snippets found. Add one above!</p>";
    return;
  }

  snippets.forEach(function (item) {
    const card = document.createElement("div");
    card.className = "snippet-card";

    // Escape < and > so HTML snippets display as text instead of executing
    const safeCode = item.code.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    card.innerHTML = `
      <div class="snippet-header">
        <h4>${item.title}</h4>
        <span class="badge">${item.language}</span>
      </div>
      <pre><code>${safeCode}</code></pre>
      <div class="actions">
        <button class="btn-copy" onclick="copyCode('${item._id}')">Copy Code</button>
        <button class="btn-secondary" onclick="startEdit('${item._id}')">Edit</button>
        <button class="btn-danger" onclick="deleteSnippet('${item._id}')">Delete</button>
      </div>
    `;
    snippetsList.appendChild(card);
  });
}

// CREATE or UPDATE Snippet
snippetForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  const token = localStorage.getItem("token");
  const editId = document.getElementById("edit-id").value;
  const title = document.getElementById("snippet-title").value;
  const language = document.getElementById("snippet-language").value;
  const code = document.getElementById("snippet-code").value;

  const url = editId ? `${API_URL}/snippets/${editId}` : `${API_URL}/snippets`;
  const method = editId ? "PUT" : "POST";

  await fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ title, language, code })
  });

  resetForm();
  loadSnippets();
});

// Populate form for Editing
function startEdit(id) {
  const snippet = allSnippets.find((s) => s._id === id);
  document.getElementById("edit-id").value = snippet._id;
  document.getElementById("snippet-title").value = snippet.title;
  document.getElementById("snippet-language").value = snippet.language;
  document.getElementById("snippet-code").value = snippet.code;

  document.getElementById("form-heading").textContent = "Edit Code Snippet";
  document.getElementById("save-btn").textContent = "Update Snippet";
  document.getElementById("cancel-edit-btn").classList.remove("hidden");
  window.scrollTo(0, 0);
}

document.getElementById("cancel-edit-btn").addEventListener("click", resetForm);

function resetForm() {
  snippetForm.reset();
  document.getElementById("edit-id").value = "";
  document.getElementById("form-heading").textContent = "Add New Code Snippet";
  document.getElementById("save-btn").textContent = "Save Snippet";
  document.getElementById("cancel-edit-btn").classList.add("hidden");
}

// DELETE Snippet
async function deleteSnippet(id) {
  const token = localStorage.getItem("token");
  await fetch(`${API_URL}/snippets/${id}`, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token }
  });
  loadSnippets();
}

// Copy code to clipboard
function copyCode(id) {
  const snippet = allSnippets.find((s) => s._id === id);
  navigator.clipboard.writeText(snippet.code);
  alert("Code copied to clipboard!");
}

// Filter snippets by programming language
filterLanguage.addEventListener("change", function () {
  const selected = filterLanguage.value;
  if (selected === "ALL") {
    displaySnippets(allSnippets);
  } else {
    const filtered = allSnippets.filter((s) => s.language === selected);
    displaySnippets(filtered);
  }
});