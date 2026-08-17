# 🗄️ MongoDB Setup Guide

Complete guide to set up MongoDB for AccountantsFactory Portal.

---

## ⚡ Quick Start — Install MongoDB on This Machine (Windows)

1. **Install MongoDB** (PowerShell or Command Prompt):
   ```powershell
   winget install MongoDB.Server
   ```
   Accept the license. MongoDB installs and runs as a Windows service.

2. **Set local database in `.env`**  
   In `backend/.env` set (or add):
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/accountantsfactory_portal
   ```
   (Use `127.0.0.1` on Windows if `localhost` gives connection refused.)
   If you don’t have `.env`, copy `backend/env.template` to `backend/.env` first, then add the line above.

3. **Verify and seed** (from project root):
   ```bash
   cd backend
   npm run setup-mongodb
   npm run setup-database
   npm run create-admin admin@accountantsfactory.com YourPassword123
   npm run dev
   ```

---

## 🎯 Quick Setup Options

### Option 1: MongoDB Atlas (Cloud) - **EASIEST** ⭐
No installation required! Use free cloud MongoDB.

### Option 2: Local MongoDB Installation
Install MongoDB on your computer.

---

## ☁️ Option 1: MongoDB Atlas (Recommended for Quick Start)

### Step 1: Create Free Account
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up with email (free tier available)
3. Verify your email

### Step 2: Create Cluster
1. Click "Build a Database"
2. Choose **FREE** (M0) tier
3. Select cloud provider (AWS recommended)
4. Choose region closest to you
5. Click "Create"

### Step 3: Create Database User
1. Go to "Database Access" (left menu)
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Username: `accountantsfactory`
5. Password: Generate secure password (save it!)
6. Database User Privileges: "Read and write to any database"
7. Click "Add User"

### Step 4: Whitelist IP Address
1. Go to "Network Access" (left menu)
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for development)
   - Or add your specific IP: `0.0.0.0/0`
4. Click "Confirm"

### Step 5: Get Connection String
1. Go to "Database" (left menu)
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Driver: "Node.js", Version: "5.5 or later"
5. Copy the connection string
6. Replace `<password>` with your database user password
7. Replace `<dbname>` with `accountantsfactory_portal`

**Example:**
```
mongodb+srv://accountantsfactory:YourPassword123@cluster0.xxxxx.mongodb.net/accountantsfactory_portal?retryWrites=true&w=majority
```

### Step 6: Update .env File
Edit `backend/.env`:
```env
MONGODB_URI=mongodb+srv://accountantsfactory:YourPassword123@cluster0.xxxxx.mongodb.net/accountantsfactory_portal?retryWrites=true&w=majority
JWT_SECRET=your_random_secret_here_min_32_characters
```

### Step 7: Test Connection
```bash
cd backend
npm run setup-mongodb
```

**✅ Done!** MongoDB Atlas is ready to use.

---

## 💻 Option 2: Local MongoDB Installation

### Windows Installation

#### Option A: Install from command line (on this machine)

**Using Windows Package Manager (winget)** — run in PowerShell or Command Prompt:

```powershell
winget install MongoDB.Server
```

- Accept the license when prompted.
- MongoDB installs as a Windows service and starts automatically.
- If `winget` says "MongoDB.Server" not found, try: `winget install MongoDB.ServerCommunity`

**Using Chocolatey** (if you have [Chocolatey](https://chocolatey.org/install) installed):

```powershell
choco install mongodb
```

Then continue from **Step 5: Configure .env** below.

---

#### Option B: Manual download and install

**Step 1: Download MongoDB**
1. Go to https://www.mongodb.com/try/download/community
2. Select:
   - Version: Latest (7.0+)
   - Platform: Windows
   - Package: MSI
3. Click "Download"

**Step 2: Install MongoDB**
1. Run the downloaded `.msi` file
2. Choose "Complete" installation
3. **Important:** Check "Install MongoDB as a Service"
4. Service Name: `MongoDB` (default)
5. Check "Run service as Network Service user"
6. **Important:** Check "Install MongoDB Compass" (GUI tool)
7. Click "Install"
8. Wait for installation to complete

**Step 3: Verify Installation**
1. Open Command Prompt or PowerShell
2. Run:
   ```cmd
   mongod --version
   ```
3. Should show MongoDB version

**Step 4: Start MongoDB Service**
MongoDB should start automatically. To verify:

**Using Services:**
1. Press `Win + R`
2. Type `services.msc`
3. Find "MongoDB" service
4. Status should be "Running"
5. If not running, right-click → Start

**Using PowerShell (as Administrator):**
```powershell
Start-Service MongoDB
```

**Using Command Prompt (as Administrator):**
```cmd
net start MongoDB
```

**Step 5: Test Connection**
```bash
cd backend
npm run setup-mongodb
```

**Step 6: Configure .env**
Edit `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/accountantsfactory_portal
JWT_SECRET=your_random_secret_here_min_32_characters
```

**✅ Done!** Local MongoDB is ready.

---

## 🔧 Setup Script

We've created an automated setup script:

```bash
cd backend
npm run setup-mongodb
```

This script will:
- ✅ Check if MongoDB is installed
- ✅ Check if MongoDB service is running
- ✅ Test connection to MongoDB
- ✅ Verify .env configuration
- ✅ Guide you through any missing steps

---

## 📋 After MongoDB Setup

Once MongoDB is running:

### 1. Seed Database
```bash
cd backend
npm run setup-database
```
This creates the database and seeds initial services.

### 2. Create Admin Account
```bash
npm run create-admin admin@accountantsfactory.com Admin@Secure123
```

### 3. Start Server
```bash
npm run dev
```

---

## 🆘 Troubleshooting

### "MongoDB is not installed"
- **Fix:** Install MongoDB (see Option 2 above) or use MongoDB Atlas (Option 1)

### "MongoDB service is not running"
- **Windows:** Start service via Services GUI or `net start MongoDB`
- **Linux/Mac:** `sudo systemctl start mongod`

### "Connection refused"
- Check MongoDB is running
- Verify connection string in `.env`
- For Atlas: Check IP whitelist and password

### "Authentication failed"
- **Atlas:** Verify username and password in connection string
- **Local:** MongoDB should work without auth by default

### "Cannot find module 'mongoose'"
- Run `npm install` in `backend/` directory

---

## 🎯 Quick Commands Reference

```bash
# Setup MongoDB
npm run setup-mongodb

# Setup database (seed data)
npm run setup-database

# Create admin
npm run create-admin <email> <password>

# Start server
npm run dev
```

---

## 📚 MongoDB Resources

- **MongoDB Atlas:** https://www.mongodb.com/cloud/atlas
- **MongoDB Download:** https://www.mongodb.com/try/download/community
- **MongoDB Compass:** https://www.mongodb.com/products/compass
- **MongoDB Docs:** https://docs.mongodb.com/

---

**Choose Option 1 (Atlas) for fastest setup, or Option 2 (Local) for offline development!** 🚀
