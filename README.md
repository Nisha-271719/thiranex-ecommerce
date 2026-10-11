# Thiranex E-Commerce Web Application

A complete beginner-friendly full-stack e-commerce application built with:
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Authentication: JWT + bcrypt
- Roles: Admin / User

## Features
- Product catalog
- Search and category filtering
- Add to cart
- Checkout and order creation
- User registration/login
- Admin product add/edit/delete
- Admin order status updates
- User order tracking
- Responsive UI

## Run locally

### 1. Install Node.js
Install Node.js LTS.

### 2. Install dependencies
Open a terminal in this project folder:
```bash
npm install
```

### 3. Configure MongoDB
Create `.env` from `.env.example`:
```bash
copy .env.example .env
```
On PowerShell you can also use:
```powershell
Copy-Item .env.example .env
```

For MongoDB Atlas, replace `MONGO_URI` with your Atlas connection string.

### 4. Create the admin account
```bash
npm run seed:admin
```

The default admin credentials are:
- Email: admin@example.com
- Password: Admin@12345

Change them in `.env` before seeding if you want different credentials.

### 5. Start
```bash
npm start
```

Open:
http://localhost:5000

For development:
```bash
npm run dev
```

## Important
Never commit `.env` to GitHub. The `.gitignore` already excludes it.
