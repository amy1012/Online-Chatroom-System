const socket = io();

// 獲取 HTML 元素
const messageContainer = document.getElementById("message-container");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const nameInput = document.getElementById("name-input");


// 從 localStorage 獲取用戶資訊
const user = JSON.parse(localStorage.getItem("user")) || {
  userId: null,
  username: "anonymous",
};

console.log("目前使用者資訊:", user);
nameInput.value = user.username;


if (!user || !user.userId) {
  // 如果沒有登入，重定向到登入頁面
  window.location.href = 'login.html';
}

// 監聽送出表單事件
messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage();
});


// 發送訊息
function sendMessage() {
  if (messageInput.value.trim() === "") return;

  const data = {
    username: user.username,
    userId: user.userId,  // 傳遞 userId
    message: messageInput.value,
    timestamp: new Date(),
  };

  console.log("發送的訊息:", data);
  socket.emit("message", data);
  addMessageToUI(true, data);
  messageInput.value = "";
}

// 接收訊息
socket.on("chat-message", (data) => {
  if (data.userId === user.userId) return;
  const isOwnMessage = data.userId === user.userId;
  addMessageToUI(isOwnMessage, data);
});

// 加載歷史訊息
socket.on("load-messages", (messages) => {
  messages.forEach((message) => {
    const isOwnMessage = message.userId === user.userId;
    addMessageToUI(isOwnMessage, message);
  });
});

// 在 UI 中顯示訊息
function addMessageToUI(isOwnMessage, data) {
  const element = document.createElement("li");
  element.className = isOwnMessage ? "message-right" : "message-left";
  element.innerHTML = `
    <p class="message">
      ${data.message}
      <span>${data.username} ● ${new Date(data.timestamp).toLocaleTimeString()}</span>
    </p>
  `;
  messageContainer.appendChild(element);
  scrollToBottom();
}

// 自動捲動到底部
function scrollToBottom() {
  messageContainer.scrollTop = messageContainer.scrollHeight;
}

const clientsTotal = document.getElementById("client-total");

// 監聽從後端發送過來的 clients-total 事件，更新總人數
socket.on("clients-total", (data) => {
  clientsTotal.textContent = `Total clients: ${data}`;
});


//---------看誰在打字------------//
messageInput.addEventListener('focus', () => {
  socket.emit('feedback', { feedback: `✍️ ${nameInput.value} is typing...` });
});

messageInput.addEventListener('keypress', () => {
  socket.emit('feedback', { feedback: `✍️ ${nameInput.value} is typing...` });
});

messageInput.addEventListener('blur', () => {
  socket.emit('feedback', { feedback: '' }); // 清除打字提示
});

// 接收其他用戶的「正在打字」事件並顯示
socket.on('feedback', (data) => {
  clearFeedback(); // 清除之前的打字提示
  if (data.feedback) {
    const element = document.createElement('li');
    element.className = "message-feedback";
    element.innerHTML = `<p class="feedback">${data.feedback}</p>`;
    messageContainer.appendChild(element);
    scrollToBottom(); // 自動捲動到底部
  }
});

// 清除「正在打字」的提示
function clearFeedback() {
  document.querySelectorAll('.message-feedback').forEach((element) => {
    element.remove();
  });
}


//----------登出----------------//
const logoutButton = document.getElementById("logout-button");

// 監聽登出按鈕的點擊事件
logoutButton.addEventListener("click", () => {
  // 清除 localStorage 中的使用者資訊
  localStorage.removeItem("user");

  // 導向登入頁面
  window.location.href = "login.html";
});

