const botId = "bot123";

const userId =
  localStorage.getItem("chat_user") ||
  Math.random().toString(36).substring(2);

localStorage.setItem("chat_user", userId);

async function sendMessage(text) {
  await fetch("/message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bot_id: botId,
      user: userId,
      message: text,
    }),
  });
}

window.sendMessage = sendMessage;