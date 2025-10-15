const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');

// PostgreSQL connection configuration
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'gatepass',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'kcc',
});

// Generate QR code for student
async function generateQRCode(studentId) {
  try {
    const qrCodeData = await QRCode.toString(studentId, { type: 'utf8' });
    return qrCodeData;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return `QR_${studentId}_${Date.now()}`;
  }
}

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database seeding...');

    // Check if data already exists
    const adminCount = await client.query('SELECT COUNT(*) FROM admins');
    const studentCount = await client.query('SELECT COUNT(*) FROM students');

    // Seed admin user if not exists
    if (parseInt(adminCount.rows[0].count) === 0) {
      console.log('Creating default admin user...');
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await client.query(
        'INSERT INTO admins (username, password) VALUES ($1, $2)',
        ['admin', hashedPassword]
      );
      console.log('✓ Default admin user created (username: admin, password: admin123)');
    } else {
      console.log('- Admin user already exists');
    }

    // Seed sample students if not exists
    if (parseInt(studentCount.rows[0].count) === 0) {
      console.log('Creating sample students...');
      
      const sampleStudents = [
        {
          student_id: 'STU001',
          name: 'John Doe',
          department: 'Computer Science',
          contact: '+1234567890',
          password: 'password123'
        },
        {
          student_id: 'STU002',
          name: 'Jane Smith',
          department: 'Electrical Engineering',
          contact: '+1234567891',
          password: 'password123'
        },
        {
          student_id: 'STU003',
          name: 'Mike Johnson',
          department: 'Mechanical Engineering',
          contact: '+1234567892',
          password: 'password123'
        },
        {
          student_id: 'STU004',
          name: 'Sarah Wilson',
          department: 'Computer Science',
          contact: '+1234567893',
          password: 'password123'
        },
        {
          student_id: 'STU005',
          name: 'David Brown',
          department: 'Civil Engineering',
          contact: '+1234567894',
          password: 'password123'
        }
      ];

      for (const student of sampleStudents) {
        const hashedPassword = bcrypt.hashSync(student.password, 10);
        const qrCode = await generateQRCode(student.student_id);
        
        await client.query(
          `INSERT INTO students (student_id, name, department, contact, password, qr_code) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [student.student_id, student.name, student.department, student.contact, hashedPassword, qrCode]
        );
        
        console.log(`✓ Created student: ${student.name} (${student.student_id})`);
      }

      // Create some sample gate logs
      console.log('Creating sample gate logs...');
      const gateLogs = [
        { student_id: 'STU001', access_type: 'entry', access_status: 'granted', notes: 'Regular entry' },
        { student_id: 'STU001', access_type: 'exit', access_status: 'granted', notes: 'Regular exit' },
        { student_id: 'STU002', access_type: 'entry', access_status: 'granted', notes: 'Regular entry' },
        { student_id: 'STU003', access_type: 'entry', access_status: 'denied', notes: 'Invalid QR code' },
        { student_id: 'STU004', access_type: 'entry', access_status: 'granted', notes: 'Regular entry' },
        { student_id: 'STU005', access_type: 'exit', access_status: 'granted', notes: 'Regular exit' }
      ];

      for (const log of gateLogs) {
        await client.query(
          `INSERT INTO gate_logs (student_id, access_type, access_status, notes, timestamp) 
           VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${Math.floor(Math.random() * 24)} hours')`,
          [log.student_id, log.access_type, log.access_status, log.notes]
        );
      }
      
      console.log('✓ Created sample gate logs');
    } else {
      console.log('- Students already exist');
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedDatabase().catch(console.error);
}

module.exports = { seedDatabase };
