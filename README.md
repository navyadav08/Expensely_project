# 📱 Expensely – Smart Expense Management App

**Expensely** is an AI-powered, cross-platform mobile application that simplifies personal and group expense management. With features like OCR-based receipt scanning, a chatbot for natural-language financial queries, group expense tracking, and real-time notifications, Expensely offers an intuitive and intelligent solution for day-to-day finance tracking.

---

## 🧠 Key Features

- 📸 **OCR-Based Receipt Scanning**  
  Automatically extract text from receipts using the camera with Tesseract.js and log expenses instantly.

- 💬 **AI-Powered Chatbot (LLM via Ollama)**  
  Ask questions like *“How much did I spend last week?”* and receive personalized insights.

- 👥 **Group Expense Management**  
  Create and manage shared expenses with friends, split bills, and automate reminders.

- 🔔 **Notifications & Reminders**  
  Send push notifications (via Firebase Cloud Messaging) and email alerts (via Nodemailer) for pending dues and activity.

- 📊 **Expense Analytics & Reports**  
  Visualize spending trends with interactive charts for smarter budgeting decisions.

---

## 🔧 Tech Stack

### 💻 Frontend – Mobile App
- React Native (TypeScript)
- `react-native-image-picker`, `react-native-fs`
- UI: FlatList, ScrollView, TouchableOpacity, ActivityIndicator
- Charts: `react-native-chart-kit`

### 🧠 Backend
- Node.js + Express.js
- OCR: Tesseract.js
- Chatbot: Local LLM via Ollama (LLaMA3, Mistral, etc.)
- Email: Nodemailer
- Middleware: `cors`, `body-parser`

### 🔐 Authentication & Notifications
- Firebase Authentication
- Firebase Cloud Messaging (FCM)

### 🧪 Tools & Deployment
- IDE: VS Code
- Testing: Postman, Android Emulator, Real Device
- Version Control: Git + GitHub
- Deployment: Render (Backend), Firebase App Distribution
- Database: MongoDB Atlas (for syncing)
