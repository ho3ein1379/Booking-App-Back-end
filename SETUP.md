# 🚀 Booking System Backend - Setup Guide

## مرحله 1: نصب PostgreSQL

### macOS
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Ubuntu/Linux
```bash
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start
```

### Windows
- دانلود از: https://www.postgresql.org/download/windows/

## مرحله 2: تنظیم Workspace

```bash
# 1. فولدر رو بسازید
mkdir booking-app && cd booking-app

# 2. Copy تمام فایل‌های ما اینجا (از repo)

# 3. نصب dependencies
npm install

# 4. .env تنظیم کنید
cp .env.example .env

# Edit .env:
DATABASE_URL="postgresql://postgres:password@localhost:5432/booking_app"
JWT_SECRET="your-secret-key-at-least-32-characters-long"
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

## مرحله 3: Database Setup

```bash
# Create database
createdb booking_app

# Run migrations
npm run migrate

# (Optional) Seed test data
npm run seed
```

## مرحله 4: Run Server

```bash
npm run dev
```

✅ Server on `http://localhost:5000` is ready!

---

## 📝 Testing API با Postman/cURL

### 1️⃣ Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "09123456789"
  }'
```

Response:
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CUSTOMER"
  },
  "token": "eyJhbGc..."
}
```

### 2️⃣ Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### 3️⃣ Create Business (with token)
```bash
curl -X POST http://localhost:5000/api/business \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Johns Barbershop",
    "category": "barber",
    "description": "Professional barbershop",
    "phone": "09123456789",
    "email": "barber@example.com",
    "address": "123 Main Street",
    "city": "Tehran",
    "openTime": "09:00",
    "closeTime": "18:00",
    "slotDuration": 30
  }'
```

### 4️⃣ Create Service
```bash
curl -X POST http://localhost:5000/api/business/BUSINESS_ID/services \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hair Cut",
    "description": "Professional hair cut",
    "duration": 30,
    "price": 25.00
  }'
```

### 5️⃣ Create Time Slots
```bash
curl -X POST http://localhost:5000/api/slots \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "BUSINESS_ID",
    "date": "2024-02-15",
    "slots": [
      {"startTime": "09:00", "endTime": "09:30"},
      {"startTime": "09:30", "endTime": "10:00"},
      {"startTime": "10:00", "endTime": "10:30"},
      {"startTime": "14:00", "endTime": "14:30"},
      {"startTime": "14:30", "endTime": "15:00"}
    ]
  }'
```

### 6️⃣ Get Available Slots
```bash
curl "http://localhost:5000/api/slots/available?businessId=BUSINESS_ID&serviceId=SERVICE_ID&date=2024-02-15" \
  -H "Content-Type: application/json"
```

### 7️⃣ Create Booking
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "BUSINESS_ID",
    "serviceId": "SERVICE_ID",
    "slotId": "SLOT_ID",
    "customerName": "John Doe",
    "customerPhone": "09123456789"
  }'
```

### 8️⃣ Create Payment Intent
```bash
curl -X POST http://localhost:5000/api/payments/create-intent \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "BOOKING_ID"
  }'
```

---

## 🧪 Advanced Testing

### ✅ Postman Collection

Import این collection به Postman:

```json
{
  "info": {
    "name": "Booking API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "url": "http://localhost:5000/api/auth/register"
          }
        }
      ]
    }
  ]
}
```

### 🔍 Debug Logs

برای دیدن SQL queries:

1. اضافه کنید به `.env`:
```
DEBUG=prisma:*
```

2. یا در `src/lib/prisma.ts` تغییر دهید:
```typescript
log: ["query", "info", "warn", "error"]
```

---

## 📊 Database Structure

```
User (CUSTOMER)
├── Bookings
└── Payments

User (BUSINESS_OWNER)
└── Business
    ├── Services
    ├── TimeSlots
    └── Bookings
```

---

## ⚠️ Common Issues & Fixes

### 1. Database Connection Error
```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Or on macOS
brew services list

# Reset database
dropdb booking_app
createdb booking_app
npm run migrate
```

### 2. JWT Token Expired
- Token lifetime: 7 days (configurable in `.env`)
- Login again to get new token

### 3. Port Already in Use
```bash
# Change PORT in .env
PORT=5001

# Or kill process on port 5000
lsof -i :5000
kill -9 <PID>
```

### 4. Stripe Webhook
- Get webhook secret from Stripe Dashboard
- Add to `.env`:
```
STRIPE_WEBHOOK_SECRET="whsec_test_..."
```

---

## 🚀 Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET`
- [ ] Configure Stripe keys properly
- [ ] Set up PostgreSQL backups
- [ ] Enable HTTPS
- [ ] Configure proper CORS origins
- [ ] Set up monitoring & logging
- [ ] Use environment-specific `.env` files
- [ ] Run security audit: `npm audit`

---

## 📚 Next Steps

1. ✅ Back-end تمام شد
2. ⏳ Front-end Next.js (بعدی)
3. ⏳ Email notifications
4. ⏳ SMS notifications
5. ⏳ Dashboard برای صاحبان کسب‌وکار

---

## 💡 Tips

- استفاده کنید از VS Code REST Client extension برای testing
- یا Postman / Insomnia برای بهتر
- PostgreSQL GUI: pgAdmin یا DBeaver
- API documentation: http://localhost:5000/api/docs (خود ساختیم نیست)

---

## 🔗 Useful Resources

- [Express.js Docs](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT.io](https://jwt.io/)
- [Stripe API Reference](https://stripe.com/docs/api)

---

حالا باید راه‌اندازی شد! 🎉
