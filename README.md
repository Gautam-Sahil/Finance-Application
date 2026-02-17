# 🏦 Finance & Loan Management System

![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![ExpressJS](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)


<img width="3320" height="1620" alt="finance" src="https://github.com/user-attachments/assets/63b92ba8-ae30-433e-bb68-348f551439e7" /><br>



> A full-stack **MEAN** (MongoDB, Express, Angular, Node.js) application for managing loan applications, tracking repayments, and facilitating communication between Bankers and Customers.

---

## 🚀 Live Demo

| Component | Status | Link |
| :--- | :--- | :--- |
| **Frontend** | 🟢 Live | [**Click here to view App**](https://finance-application-teal.vercel.app/) |
| **Backend** | 🟢 Live | [**API Health Check**](https://finance-app-backend-14qy.onrender.com/) |

---

## 🌟 Key Features

### 🔐 Authentication & Security
* **Secure Login/Signup:** JWT-based authentication with encrypted passwords (Bcrypt).
* **Google OAuth:** One-click seamless login using Google Identity Platform.
* **Role-Based Access Control (RBAC):** Distinct dashboards and permission sets for **Admin**, **Banker**, and **Customer**.
* **OTP Verification:** Secure email verification using Nodemailer/Resend API.

### 💸 Loan Management
* **Loan Application Workflow:** End-to-end lifecycle: *Applied* -> *Verified* -> *Approved* -> *Disbursed*.
* **EMI Calculator:** Interactive tool to estimate monthly payments with amortization schedules.
* **PDF Export:** Generate professional Loan Offer Letters and detailed Repayment Schedules.
* **Document Verification:** Bankers can preview uploaded proofs (PDF/Images) and mark them as verified.

### 💳 Repayment & Accounting
* **Repayment Tracking:** Dedicated module to track Paid, Pending, and Overdue EMIs.
* **Transaction History:** View complete payment logs with dates and transaction references.
* **Status Automation:** Auto-updates loan status based on repayment completion.

### 🎫 Help Desk & Support
* **Ticket System:** Customers can raise support tickets for issues or queries.
* **Admin Resolution:** Bankers/Admins can view tickets, reply to queries, and update ticket status (Open/Closed).
* **Priority Tagging:** Categorize issues by Low, Medium, or High priority.

### 🔔 Real-Time Updates
* **Socket.io Integration:** Instant push notifications for loan status changes (Approved, Rejected, Verified).
* **In-App Alerts:** Bell icon with dynamic unread count badges.
* **Interactive Chatbot:** Automated support bot for answering FAQs about eligibility and status.

### 📊 Dashboard & Analytics
* **Visual Charts:** Interactive graphs showing Loan Trends, Repayment History, and User Distribution.
* **Audit Logs:** Security module for Admins to track sensitive actions (User role changes, Loan deletions).
* **Advanced Search:** Server-side pagination, searching, and filtering for managing large user bases.

### 👤 User Profile Management
* **Profile Customization:** Users can update personal details.
* **Security Settings:** Dedicated "Change Password" flow with current password validation.
* **Responsive Design:** Fully mobile-responsive UI built with **Bootstrap 5**.

---

## 🛠️ Tech Stack

**Frontend:**
* **Framework:** Angular  (Standalone Components, Signals)
* **Styling:** Bootstrap 5, Custom CSS
* **Http Client:** Angular HttpClient (Interceptors for JWT)
* **Visuals:** Ngx-Charts, Toastr (Ngx-Sonner)

**Backend:**
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB Atlas (Mongoose ODM)
* **Real-time:** Socket.io
* **Email:** Nodemailer / Resend API

---

## 📸 Screenshots

| Dashboard |

 ![Customer Dash](https://github.com/user-attachments/assets/a9f945f2-4980-41be-9b35-8d618d3c98bf) 

| Request Funds | 

 ![EMI Calc](https://github.com/user-attachments/assets/0b1cf447-c466-4d52-8ed6-bf35e0a71946) 

| History | 

 ![EMI Calc](https://github.com/user-attachments/assets/bf0f159b-2248-4cf3-a741-801b7fcd49e3) 
 
| Audit Logs | 

 ![EMI Calc](https://github.com/user-attachments/assets/9e0c143d-8030-4e29-ac90-db02f75d3814) 




## ⚙️ Local Installation Guide

Follow these steps to run the project locally on your machine.

### Prerequisites
* Node.js (v18 or higher)
* MongoDB (Local or Atlas URL)
* Angular CLI (`npm install -g @angular/cli`)

### 1. Clone the Repository
```bash
git clone [https://github.com/Gautam-Sahil/Finance-Application.git](https://github.com/Gautam-Sahil/Finance-Application.git)
cd Finance-Application

```
---
**Developed with ❤️ by Gautam Tiwari**



