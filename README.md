# TournamentWarta - Sports Tournament Management System

**TournamentWarta** is a comprehensive web application designed to facilitate the organization, management, and visualization of sports tournaments. Built with Node.js and Express, the system handles the entire tournament lifecycle—from user registration and event creation to automatic bracket generation and match result reporting.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Installation & Setup](#installation--setup)
- [Application Workflow](#application-workflow)
- [Database Schema](#database-schema)
- [Security & Concurrency](#security--concurrency)

---

## 🚀 Project Overview

The goal of this project was to create a robust platform where users can organize their own tournaments (e.g., Tennis, E-sports, Boxing) and allow others to compete. The system emphasizes data integrity, concurrency control during registration, and a visual representation of tournament ladders.

## ✨ Key Features

### 1. User Management & Authentication
* **Secure Registration:** Users sign up with Name, Email, and Password. Passwords are hashed using `bcrypt`.
* **Email Verification:** Integration with **Nodemailer** to send a 24-hour expiration confirmation link upon registration. Accounts remain inactive until confirmed.
* **Password Recovery:** "Forgot Password" functionality with secure token generation and email delivery.
* **Profile Management:** Users can view their active participations and organized tournaments.

### 2. Tournament Organization
* **CRUD Operations:** Organizers can Create, Read, Update, and Delete tournaments.
* **Validation:** Prevention of creating tournaments in the past. Required fields include location (integrated via Google Maps), discipline, start time, and deadlines.
* **Pagination & Search:** The main dashboard features a paginated list (10 items per page) with a search mechanism filtering by tournament name.

### 3. Participation System
* **Registration Logic:** Users sign up for tournaments by providing a unique **License Number** and **Current Ranking**.
* **Constraints:** The system enforces uniqueness for licenses/rankings and strictly adheres to the maximum participant limit set by the organizer.

### 4. Ladder Generation & Competition
* **Automatic Seeding:** Once the deadline passes, the organizer generates the ladder. The system automatically seeds players based on their ranking (Highest rank vs Lowest rank logic).
* **Visual Bracket:** Matches are displayed in a responsive grid layout (CSS Grid/Flexbox), not just a simple table.
* **Match Reporting:**
    * Both participants must report the result.
    * **Conflict Resolution:** If players report different winners, the result is discarded, and they are prompted to resubmit.
    * **Live Updates:** The bracket visually updates (highlighting the winner in green) immediately upon successful result consensus.

---

## 🛠 Technology Stack

* **Backend:** Node.js, Express.js
* **Frontend:** EJS (Embedded JavaScript Templating), CSS3 (Custom Grid/Flexbox layout).
* **Database:** SQLite (via Sequelize ORM).
* **Utilities:**
    * `nodemailer` (Email services)
    * `bcryptjs` (Password hashing)
    * `express-session` (Session management)

---

## ⚙️ Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/phoeenixxx/TournamentWarta.git](https://github.com/phoeenixxx/TournamentWarta.git)
    cd TournamentWarta
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment:**
    * Open `app.js`.
    * Locate the `nodemailer` transporter configuration.
    * Update the `user` and `pass` fields with your email credentials (or use environment variables for security).

4.  **Run the Application:**
    ```bash
    node app.js
    ```

5.  **Access the App:**
    Open your browser and navigate to: `http://localhost:3001`

---

## 📖 Application Workflow

1.  **Register/Login:** Create an account and click the link simulated in the console (or email) to activate it.
2.  **Create Tournament:** Go to "Create", fill in details.
3.  **Join:** Log in as a different user, click on a tournament, and Apply (ensure the deadline hasn't passed).
4.  **Generate Ladder:** As the organizer, once the deadline passes, click "Generate Ladder" in the tournament details.
5.  **Play:** Players see their match card and click "I Won".
6.  **Win:** Once both players agree, the winner is highlighted.

---

## 🛡 Security & Concurrency

* **Concurrency Control:** The system utilizes **Sequelize Transactions** with locking mechanisms (`lock: t.LOCK.UPDATE`) during the tournament application process. This ensures that the participant limit is never exceeded, even if multiple users try to register simultaneously.
* **Input Validation:** All forms use `required` attributes and server-side validation checks.
* **Authorization:** Middleware ensures only logged-in users can perform actions, and only organizers can edit/delete their specific events.
