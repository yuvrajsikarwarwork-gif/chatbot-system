// connectors/website/widget.js

(function () {
  // --- CONFIGURATION ---
  // In production, these would be passed dynamically via the embed script tag attributes
  const BACKEND_URL = "http://localhost:4000"; 
  const BOT_ID = "f9e13c53-d450-462e-adbc-94ac06815034"; // Replace with the dynamic bot ID
  
  // --- SESSION MANAGEMENT ---
  let platformUserId = localStorage.getItem("chat_session_id");
  if (!platformUserId) {
    platformUserId = "web_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("chat_session_id", platformUserId);
  }

  // --- UI INJECTION ---
  const styles = `
    #bot-widget-container { position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: sans-serif; }
    #bot-toggle-btn { width: 60px; height: 60px; border-radius: 50%; background: #2563eb; color: white; border: none; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-size: 24px; }
    #bot-chat-window { display: none; width: 350px; height: 500px; background: white; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); display: flex; flex-direction: column; overflow: hidden; margin-bottom: 10px; border: 1px solid #e5e7eb; }
    #bot-chat-header { background: #2563eb; color: white; padding: 15px; font-weight: bold; text-align: center; }
    #bot-chat-messages { flex: 1; padding: 15px; overflow-y: auto; background: #f9fafb; display: flex; flex-direction: column; gap: 10px; }
    #bot-chat-input-area { display: flex; padding: 10px; background: white; border-top: 1px solid #e5e7eb; }
    #bot-chat-input { flex: 1; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; outline: none; }
    #bot-send-btn { background: #2563eb; color: white; border: none; padding: 0 15px; margin-left: 5px; border-radius: 6px; cursor: pointer; }
    .msg-bubble { max-width: 80%; padding: 10px 14px; border-radius: 18px; font-size: 14px; line-height: 1.4; word-wrap: break-word; }
    .msg-user { background: #2563eb; color: white; align-self: flex-end; border-bottom-right-radius: 4px; }
    .msg-bot { background: #e5e7eb; color: #1f2937; align-self: flex-start; border-bottom-left-radius: 4px; }
    .msg-interactive-btn { display: block; width: 100%; margin-top: 5px; padding: 8px; background: white; border: 1px solid #2563eb; color: #2563eb; border-radius: 6px; cursor: pointer; text-align: center; font-size: 13px; }
    .msg-interactive-btn:hover { background: #eff6ff; }
  `;

  const styleTag = document.createElement("style");
  styleTag.innerHTML = styles;
  document.head.appendChild(styleTag);

  const container = document.createElement("div");
  container.id = "bot-widget-container";
  container.innerHTML = `
    <div id="bot-chat-window" style="display: none;">
      <div id="bot-chat-header">Live Chat</div>
      <div id="bot-chat-messages"></div>
      <div id="bot-chat-input-area">
        <input type="text" id="bot-chat-input" placeholder="Type a message..." />
        <button id="bot-send-btn">Send</button>
      </div>
    </div>
    <button id="bot-toggle-btn">💬</button>
  `;
  document.body.appendChild(container);

  const toggleBtn = document.getElementById("bot-toggle-btn");
  const chatWindow = document.getElementById("bot-chat-window");
  const messagesDiv = document.getElementById("bot-chat-messages");
  const inputField = document.getElementById("bot-chat-input");
  const sendBtn = document.getElementById("bot-send-btn");

  toggleBtn.addEventListener("click", () => {
    chatWindow.style.display = chatWindow.style.display === "none" ? "flex" : "none";
  });

  // --- SOCKET.IO LOGIC ---
  const loadSocketIo = () => {
    const script = document.createElement("script");
    script.src = "https://cdn.socket.io/4.7.2/socket.io.min.js";
    script.onload = initializeChat;
    document.head.appendChild(script);
  };

  let socket;

  const initializeChat = () => {
    // Connect to the backend
    socket = io(BACKEND_URL);

    socket.on("connect", () => {
      console.log("Widget connected to Chatbot Engine");
      // Register this user to their specific room
      socket.emit("register_web_user", { botId: BOT_ID, platformUserId });
    });

    // Listen for incoming bot messages
    socket.on("receive_web_message", (data) => {
      const msg = data.message;
      if (msg.type === "text" || msg.type === "system") {
        appendMessage(msg.text, "bot");
      } else if (msg.type === "interactive") {
        appendInteractiveMessage(msg.text, msg.buttons, "bot");
      }
    });
  };

  // --- MESSAGE HANDLING ---
  const sendMessage = (text, buttonId = null) => {
    if (!text.trim() && !buttonId) return;
    
    // Show user message in UI
    appendMessage(text, "user");
    
    // Send to backend via Socket
    socket.emit("send_web_message", {
      botId: BOT_ID,
      platformUserId,
      userName: "Web Guest",
      text: text,
      buttonId: buttonId
    });

    inputField.value = "";
  };

  sendBtn.addEventListener("click", () => sendMessage(inputField.value));
  inputField.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage(inputField.value);
  });

  // --- UI HELPERS ---
  const appendMessage = (text, sender) => {
    const bubble = document.createElement("div");
    bubble.className = `msg-bubble msg-${sender}`;
    bubble.innerText = text;
    messagesDiv.appendChild(bubble);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  const appendInteractiveMessage = (text, buttons, sender) => {
    const wrapper = document.createElement("div");
    wrapper.style.alignSelf = sender === "user" ? "flex-end" : "flex-start";
    wrapper.style.maxWidth = "80%";

    const bubble = document.createElement("div");
    bubble.className = `msg-bubble msg-${sender}`;
    bubble.innerText = text;
    wrapper.appendChild(bubble);

    if (buttons && buttons.length > 0) {
      const btnContainer = document.createElement("div");
      btnContainer.style.marginTop = "5px";
      buttons.forEach(btn => {
        const btnElement = document.createElement("button");
        btnElement.className = "msg-interactive-btn";
        btnElement.innerText = btn.title;
        btnElement.onclick = () => {
          sendMessage(btn.title, btn.id);
          btnContainer.style.display = "none"; // Hide buttons after click
        };
        btnContainer.appendChild(btnElement);
      });
      wrapper.appendChild(btnContainer);
    }

    messagesDiv.appendChild(wrapper);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  // Start the widget
  loadSocketIo();
})();