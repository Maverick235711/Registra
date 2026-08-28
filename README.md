# 🚀 Registra

**Registra** is an intelligent automated form-filling application designed to simplify exam registrations. Instead of manually filling out tedious personal details, academic history, and contact information for every single exam you take, Registra allows you to input your information **once** and automatically populate registration forms across multiple exam portals worldwide.

---

## ✨ Features

- **One-Time Data Entry:** Fill out your core universal profile details just once.
- **Cross-Platform Compatibility:** Supports diverse examination portals globally.
- **Smart Mapping:** Automatically detects and aligns form entries (Name, DOB, Marks, Documents) with respective inputs.
- **Fast & Secure:** Locally handles or securely processes user profiles for immediate injection into forms.
- **Vite + React Powered:** Super fast, responsive, and modern user interface.

---

## 🛠️ Tech Stack

- **Frontend:** React.js, Vite
- **Styling:** CSS / Tailwind CSS
- **State/Routing:** React Hooks, React Router
- **Database/Auth:** Firebase (Auth, Firestore, Storage)

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites

Make sure you have Node.js installed on your computer.
- [Download Node.js](https://nodejs.org)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Maverick235711/Registra.git
   ```

2. **Navigate into the project directory:**
   ```bash
   cd examvault
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

---

## 📂 Project Structure

A quick overview of the key directories inside Registra:

- `src/components/` - Reusable UI components (Buttons, Inputs, Modals).
- `src/AuthScreen.jsx` - Secure user login and multi-auth registration logic.
- `src/AutoFillPage.jsx` - Core automation dashboard tracking your saved user variables.
- `src/Documentspage.jsx` - Repository for handling identity cards, signatures, and marksheets.
