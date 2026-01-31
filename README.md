# Booking System - Backend

یک سیستم نوبت‌دهی کامل برای کسب‌وکارهای خصوصی

## ✨ Features

- 🔐 **Authentication & Authorization** - JWT-based auth with role management
- 🏢 **Business Management** - صاحبان کسب‌وکار می‌تونند پروفایل خود و خدمات رو مدیریت کنند
- 📅 **Time Slot Management** - مدیریت وقت‌های خالی و دسترس‌پذیری
- 🗓️ **Booking System** - کاربران می‌تونند نوبت‌هایشون رو مدیریت کنند
- 💳 **Payment Integration** - Stripe integration برای پرداخت‌های امن
- 📧 **Email Notifications** - (Ready for implementation) ارسال ایمیل‌های تایید

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 12
- npm یا yarn

### Installation

1. **Clone the repository**
```bash
cd booking-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Set up database**
```bash
# Create database
createdb booking_app

# Run migrations
npm run migrate
```

5. **Run the server**
```bash
npm run dev
```

Server will start on `http://localhost:5000`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - ثبت‌نام کاربر جدید
- `POST /api/auth/login` - ورود کاربر
- `GET /api/auth/me` - دریافت اطلاعات کاربر فعلی

### Business
- `POST /api/business` - ایجاد کسب‌وکار جدید
- `GET /api/business/my-business` - دریافت اطلاعات کسب‌وکار خود
- `GET /api/business/:id` - دریافت اطلاعات کسب‌وکار (عمومی)
- `PUT /api/business/:id` - ویرایش کسب‌وکار

### Services
- `POST /api/business/:businessId/services` - ایجاد خدمت جدید
- `GET /api/business/:businessId/services` - دریافت خدمات کسب‌وکار
- `PUT /api/business/:businessId/services/:serviceId` - ویرایش خدمت
- `DELETE /api/business/:businessId/services/:serviceId` - حذف خدمت

### Time Slots
- `POST /api/slots` - ایجاد وقت‌های خالی
- `GET /api/slots/available` - دریافت وقت‌های خالی
- `DELETE /api/slots/:slotId` - حذف وقت‌های خالی

### Bookings
- `POST /api/bookings` - ایجاد نوبت
- `GET /api/bookings/my-bookings` - دریافت نوبت‌های خود
- `GET /api/bookings/business/:businessId` - دریافت نوبت‌های کسب‌وکار
- `PATCH /api/bookings/:bookingId/status` - تغییر وضعیت نوبت
- `DELETE /api/bookings/:bookingId` - کنسل کردن نوبت

### Payments
- `POST /api/payments/create-intent` - ایجاد intent برای پرداخت
- `POST /api/payments/confirm` - تایید پرداخت
- `GET /api/payments/:paymentId` - دریافت وضعیت پرداخت

## 🗄️ Database Schema

### Users
- User roles: CUSTOMER, BUSINESS_OWNER, ADMIN
- Email, password (hashed), profile info

### Businesses
- Business details, operating hours, settings
- Services, time slots, bookings

### Bookings
- Customer-service-business relationships
- Status tracking: PENDING, CONFIRMED, CANCELLED, COMPLETED

### Payments
- Stripe integration
- Payment status tracking

## 🔐 Authentication

تمام routes (جز register و login) نیاز به JWT token دارند:

```bash
Authorization: Bearer <your_jwt_token>
```

## 📝 Example Requests

### Register
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

### Create Business
```bash
curl -X POST http://localhost:5000/api/business \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John\'s Barber Shop",
    "category": "barber",
    "phone": "09123456789",
    "email": "barber@example.com",
    "address": "123 Main St",
    "city": "Tehran"
  }'
```

## 🧪 Testing

```bash
npm test
```

## 📦 Built With

- **Express.js** - Web framework
- **Prisma** - ORM
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Stripe** - Payment processing
- **TypeScript** - Type safety
- **Zod** - Schema validation

## 📝 Notes

- Database migrations run automatically with `npm run migrate`
- Stripe webhook endpoint needs to be configured in Stripe dashboard
- Email functionality is set up but needs provider configuration
- All passwords are hashed with bcrypt (10 rounds)

## 🔄 Next Steps

1. ✅ Back-end API است (Ready)
2. ⏳ Front-end با Next.js (Coming next)
3. ⏳ PWA capabilities
4. ⏳ Email notifications
5. ⏳ SMS notifications

## 🤝 Support

برای سوالات یا مشکلات، لطفاً issue بگذارید.
