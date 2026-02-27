# Belgaonkar Fitness - Gym Management System

A complete mobile-first gym management system designed for small to mid-size gyms in India.

## 🎯 Features

### Core Functionality
- **Member Management**: Add, edit, view member profiles with complete history
- **Package Management**: Create and manage membership packages
- **Attendance Tracking**: Quick search-based check-in system
- **Payment Tracking**: Record payments and generate invoices
- **Dashboard**: Real-time metrics and insights
- **Reports**: Expiring memberships, inactive members, pending payments
- **WhatsApp Integration**: Manual reminders via WhatsApp click-to-chat
- **Role-Based Access**: Admin and Staff user roles

### Automation
- **Daily Expiry Checks**: Automatically flag members expiring in 5 days
- **Inactive Member Detection**: Track members not visited in 7 days
- **Birthday Reminders**: Celebrate member birthdays
- **Invoice Generation**: Professional PDF invoices

## 🚀 Quick Start

### Demo Credentials
- **Admin**: admin@belgaonkar.com / admin123
- **Staff**: staff@belgaonkar.com / staff123

### Access URL
https://belgaonkar-gym.preview.emergentagent.com

## 📱 User Guide

### For Reception Staff

#### 1. Mark Attendance
1. Go to **Attendance** page
2. Search member by name or phone
3. Tap on member to check-in
4. Confirmation appears instantly

#### 2. Add New Member
1. Go to **Members** → **Add Member**
2. Fill required details:
   - Full Name
   - Phone Number
   - Select Package (amount auto-fills)
   - Join Date
   - Initial Payment
3. Submit to create member

#### 3. Record Payment
1. Open member profile
2. Click **Record Payment**
3. Enter amount and payment mode
4. Submit (payment history updates automatically)

#### 4. Download Invoice
1. Go to member profile
2. Find payment in payment history
3. Click download icon
4. PDF invoice downloads automatically

### For Gym Owners (Admin)

#### Additional Features:
- **Create Packages**: Manage membership plans
- **View All Payments**: Track revenue
- **Delete Packages**: Remove unused packages
- **Full System Access**: All reports and analytics

## 📊 Dashboard Metrics

- **Total Members**: All registered members
- **Active Members**: Members with valid memberships
- **Expiring in 5 Days**: Members needing renewal
- **Today's Collection**: Revenue collected today
- **Pending Payments**: Outstanding dues
- **Inactive Members**: Not visited in 7 days
- **Birthday Alerts**: Members with birthdays today

## 📱 WhatsApp Integration

Manual reminder system using click-to-chat:

### Available in:
- Member profiles
- Expiring members list
- Inactive members list
- Pending payments list
- Reports section

### Message Types:
1. **Expiry Reminder**: Membership expiring soon
2. **Inactive Reminder**: Haven't seen you in a while
3. **Payment Reminder**: Pending payment notification
4. **Birthday Wishes**: Happy birthday message

## 🏗️ Technical Architecture

### Frontend
- **Framework**: React 19
- **Styling**: Tailwind CSS + Custom Design System
- **Icons**: Lucide React
- **Routing**: React Router v7
- **State**: Context API
- **HTTP**: Axios
- **Notifications**: Sonner

### Backend
- **Framework**: FastAPI
- **Database**: MongoDB (Motor - async driver)
- **Authentication**: JWT + bcrypt
- **PDF Generation**: ReportLab
- **Scheduler**: APScheduler
- **CORS**: Enabled for frontend

### Design System
- **Primary Color**: Orange (#EA580C)
- **Fonts**: Manrope (headings), Public Sans (body)
- **Style**: Clean, minimal, business dashboard
- **Mobile-First**: Fully responsive design

---

**Built with ❤️ for Belgaonkar Fitness by Emergent Labs**
