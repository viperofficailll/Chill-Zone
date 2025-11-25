# ChillZone - Random Video Chat Application

> Connect with strangers worldwide through real-time video chat

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://chillsolti.netlify.app/)




---

## 🌟 Features

- 🎥 **Real-time Video Chat** - Peer-to-peer HD video and audio using WebRTC
- 🔀 **Smart Matching** - Queue-based system with gender preference filtering
- 💬 **Live Text Chat** - Send messages alongside video streams
- 😊 **Interactive Reactions** - Send floating emoji reactions during conversations
- 📱 **Fully Responsive** - Optimized for desktop, tablet, and mobile devices
- 🎨 **Modern UI** - Glass morphism design with smooth animations
- 👥 **Live Counter** - See how many users are online in real-time
- ⚡ **Instant Connect** - Skip to next person or stop anytime

---

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Redux Toolkit** for state management
- **React Hook Form** for form validation
- **Tailwind CSS** for styling
- **Socket.IO Client** for real-time signaling
- **WebRTC API** for P2P connections
- **Vite** for blazing fast builds

### Backend
- **Node.js** with Express
- **Socket.IO** for WebSocket signaling
- **CORS** enabled for cross-origin requests
- Real-time queue management



 to Use

1. **Grant Permissions** 🎤📷
   - Allow camera and microphone access when prompted

2. **Set Preferences** ⚙️
   - Select your gender (Male/Female)
   - Choose who you want to meet (Anyone/Male/Female)

3. **Start Chatting** 🚀
   - Click "Start Video Chat"
   - Wait for a match (usually instant!)

4. **Enjoy the Conversation** 💬
   - Video and audio streams automatically connect
   - Use text chat for messaging
   - Send emoji reactions (❤️ 😂)

5. **Skip or Stop** ⏭️
   - **NEXT** - Find a new person instantly
   - **STOP** - End the session and return to home

---


---

## 🔒 Privacy & Security

- ✅ **No Data Storage** - Conversations are peer-to-peer and ephemeral
- ✅ **Anonymous** - No sign-up or personal information required
- ✅ **Encrypted** - WebRTC uses DTLS-SRTP encryption
- ✅ **No Recording** - Video streams are never recorded
- ⚠️ **Public Network** - Don't share sensitive information

---



## 📝 API Reference

### Socket.IO Events

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join-queue` | `{myGender, preference}` | Join matching queue |
| `signal` | `{type, payload}` | WebRTC signaling data |
| `chat-message` | `string` | Send text message |
| `leave` | - | Leave current room |

#### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `match-found` | `{initiator: boolean}` | Match found, start WebRTC |
| `signal` | `{type, payload}` | WebRTC signaling from peer |
| `chat-message` | `string` | Text message from peer |
| `peer-disconnected` | - | Peer left the room |

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---



## ⭐ Show Your Support

If you like this project, please give it a ⭐ on GitHub!

---

<div align="center">

**Made with ❤️ by ChillMaCoding**

*Just chilling* 😎

</div># Chill-Zone
# Chill-Zone
