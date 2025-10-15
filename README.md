# Student Gate Pass System

A modern web application for managing student gate passes using React, Next.js, and TypeScript. The system includes QR code generation, scanning, and comprehensive admin management.

## Features

### Student Module
- **Registration & Login**: Students can register with basic information (ID, name, department, contact)
- **QR Code Generation**: Unique QR codes are automatically generated for each student
- **QR Display & Download**: Students can view and download their QR codes for offline access

### Guard Module
- **QR Code Scanner**: Web camera-based QR code scanning for mobile devices
- **Real-time Verification**: Instant verification of student identity and status
- **Access Control**: Determines entry/exit based on previous activity
- **Result Display**: Clear "Access Granted" or "Access Denied" feedback

### Admin Module
- **Dashboard**: Overview of total students, daily entries/exits, and activity statistics
- **Student Management**: Add, edit, and deactivate student accounts
- **Activity Logs**: View comprehensive gate activity records with timestamps
- **Analytics**: Charts and graphs showing access patterns and department statistics

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite with better-sqlite3
- **Authentication**: JWT tokens with bcrypt password hashing
- **QR Code**: QRCode.js for generation, html5-qrcode for scanning
- **Charts**: Recharts for data visualization

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd student-gate-pass
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Default Admin Account
- **Username**: admin
- **Password**: admin123

### Getting Started

1. **Admin Setup**
   - Login as admin to access the admin dashboard
   - Add students through the Student Management section
   - View activity logs and statistics

2. **Student Registration**
   - Students can register with their information
   - Upon registration, a unique QR code is generated
   - Students can login to view and download their QR code

3. **Guard Access**
   - Guards can access the scanner dashboard
   - Use the QR scanner to verify student access
   - System automatically logs all access attempts

## Project Structure

```
student-gate-pass/
├── app/
│   ├── api/                 # API routes
│   │   ├── auth/           # Authentication endpoints
│   │   ├── student/        # Student-related APIs
│   │   ├── admin/          # Admin management APIs
│   │   └── guard/          # Guard verification APIs
│   ├── admin/              # Admin dashboard pages
│   ├── student/            # Student dashboard pages
│   ├── guard/              # Guard scanner pages
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Login/registration page
├── lib/
│   ├── auth.ts             # Authentication utilities
│   └── database.ts         # Database configuration
├── data/                   # SQLite database storage
└── public/                 # Static assets
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Student registration
- `POST /api/auth/logout` - User logout

### Student
- `GET /api/student/profile` - Get student profile

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/students` - List all students
- `POST /api/admin/students` - Add new student
- `PATCH /api/admin/students/[id]` - Update student status
- `GET /api/admin/logs` - Get activity logs

### Guard
- `POST /api/guard/verify` - Verify QR code and grant access

## Database Schema

### Students Table
- `id` - Primary key
- `student_id` - Unique student identifier
- `name` - Student's full name
- `department` - Student's department
- `contact` - Contact information
- `password` - Hashed password
- `is_active` - Account status
- `qr_code` - Unique QR code data
- `created_at` - Registration timestamp
- `updated_at` - Last update timestamp

### Gate Logs Table
- `id` - Primary key
- `student_id` - Reference to student
- `access_type` - Entry or exit
- `access_status` - Granted or denied
- `timestamp` - Access time
- `notes` - Additional information

### Admins Table
- `id` - Primary key
- `username` - Admin username
- `password` - Hashed password
- `created_at` - Creation timestamp

## Security Features

- **Password Hashing**: All passwords are hashed using bcrypt
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: All inputs are validated and sanitized
- **SQL Injection Protection**: Prepared statements for all database queries
- **Access Control**: Role-based access control (student, admin, guard)

## Browser Compatibility

- Modern browsers with camera support for QR scanning
- Mobile-responsive design
- Progressive Web App features

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Environment Variables

Create a `.env.local` file for production:

```env
JWT_SECRET=your-secret-key
NODE_ENV=production
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please create an issue in the repository.
