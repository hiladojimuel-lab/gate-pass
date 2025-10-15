import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface User {
  id: number;
  student_id?: string;
  username?: string;
  name: string;
  department?: string;
  contact?: string;
  role: 'student' | 'admin';
}

export function generateToken(user: User): string {
  return jwt.sign(
    { 
      id: user.id, 
      student_id: user.student_id,
      username: user.username,
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyToken(token: string): any {
  return jwt.verify(token, JWT_SECRET);
}

export async function authenticateStudent(studentId: string, password: string): Promise<User | null> {
  try {
    const result = await query('SELECT * FROM students WHERE student_id = $1 AND is_active = true', [studentId]);
    const student = result.rows[0];
    
    if (!student || !bcrypt.compareSync(password, student.password)) {
      return null;
    }

    return {
      id: student.id,
      student_id: student.student_id,
      name: student.name,
      department: student.department,
      contact: student.contact,
      role: 'student'
    };
  } catch (error) {
    console.error('Error authenticating student:', error);
    return null;
  }
}

export async function authenticateAdmin(username: string, password: string): Promise<User | null> {
  try {
    const result = await query('SELECT * FROM admins WHERE username = $1', [username]);
    const admin = result.rows[0];
    
    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return null;
    }

    return {
      id: admin.id,
      username: admin.username,
      name: 'Administrator',
      role: 'admin'
    };
  } catch (error) {
    console.error('Error authenticating admin:', error);
    return null;
  }
}

export function generateQRCode(studentId: string, name: string, department: string, contact: string): string {
  const studentData = {
    studentId,
    name,
    department,
    contact,
    timestamp: Date.now()
  };
  
  // Create a structured QR code data with student details
  return `GATEPASS:${JSON.stringify(studentData)}`;
}
