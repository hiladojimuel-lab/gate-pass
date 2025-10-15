# PostgreSQL Database Setup

This project has been migrated from SQLite to PostgreSQL. Follow the steps below to set up and use the database.

## Prerequisites

1. **PostgreSQL Installation**: Make sure PostgreSQL is installed and running on your system
2. **Database Creation**: Create a database named `gatepass` (or update the connection string accordingly)
3. **Environment Variables**: Ensure your `.env` file contains the correct PostgreSQL connection details

## Environment Configuration

Your `.env` file should contain:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=gatepass
POSTGRES_USER=postgres
POSTGRES_PASSWORD=kcc
NODE_ENV=development
```

## Database Setup Commands

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Migrations
```bash
npm run migrate
```
This will create all necessary tables:
- `students` - Student information and QR codes
- `gate_logs` - Access logs for entry/exit
- `admins` - Admin user accounts
- `migrations` - Migration tracking table

### 3. Seed the Database
```bash
npm run seed
```
This will populate the database with:
- Default admin user (username: `admin`, password: `admin123`)
- 5 sample students with different departments
- Sample gate access logs

## Database Schema

### Students Table
- `id` - Primary key (SERIAL)
- `student_id` - Unique student identifier (VARCHAR)
- `name` - Student's full name (VARCHAR)
- `department` - Student's department (VARCHAR)
- `contact` - Contact information (VARCHAR)
- `password` - Hashed password (VARCHAR)
- `is_active` - Account status (BOOLEAN)
- `qr_code` - QR code data (TEXT)
- `created_at` - Creation timestamp (TIMESTAMP)
- `updated_at` - Last update timestamp (TIMESTAMP)

### Gate Logs Table
- `id` - Primary key (SERIAL)
- `student_id` - Foreign key to students (VARCHAR)
- `access_type` - 'entry' or 'exit' (VARCHAR)
- `access_status` - 'granted' or 'denied' (VARCHAR)
- `timestamp` - Access timestamp (TIMESTAMP)
- `notes` - Additional notes (TEXT)

### Admins Table
- `id` - Primary key (SERIAL)
- `username` - Admin username (VARCHAR)
- `password` - Hashed password (VARCHAR)
- `created_at` - Creation timestamp (TIMESTAMP)

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login for students and admins
- `POST /api/auth/register` - Register new students
- `POST /api/auth/logout` - Logout

### Student Operations
- `GET /api/student/profile` - Get student profile

### Admin Operations
- `GET /api/admin/students` - List all students
- `POST /api/admin/students` - Create new student
- `PATCH /api/admin/students/[id]` - Update student status
- `GET /api/admin/logs` - View access logs
- `GET /api/admin/stats` - Get dashboard statistics

### Guard Operations
- `POST /api/guard/verify` - Verify student access

### Testing
- `GET /api/test-db` - Test database connection and view sample data

## Sample Data

After seeding, you'll have:

### Admin User
- Username: `admin`
- Password: `admin123`

### Sample Students
1. **John Doe** (STU001) - Computer Science
2. **Jane Smith** (STU002) - Electrical Engineering
3. **Mike Johnson** (STU003) - Mechanical Engineering
4. **Sarah Wilson** (STU004) - Computer Science
5. **David Brown** (STU005) - Civil Engineering

All students have the default password: `password123`

## Development

### Running the Application
```bash
npm run dev
```

### Database Testing
Visit `http://localhost:3000/api/test-db` to verify the database setup and view sample data.

### Adding New Migrations
1. Create a new SQL file in `scripts/migrations/` with a sequential number
2. Run `npm run migrate` to apply the new migration

### Re-seeding Data
To clear and re-seed the database:
1. Drop and recreate the database
2. Run `npm run migrate`
3. Run `npm run seed`

## Troubleshooting

### Connection Issues
- Verify PostgreSQL is running: `pg_ctl status`
- Check connection details in `.env` file
- Ensure the database exists: `createdb gatepass`

### Migration Issues
- Check PostgreSQL logs for detailed error messages
- Ensure you have proper permissions on the database
- Verify all SQL syntax is PostgreSQL compatible

### Seeding Issues
- Make sure migrations have run successfully first
- Check that the database schema matches the seeding queries
- Verify QR code generation is working properly
