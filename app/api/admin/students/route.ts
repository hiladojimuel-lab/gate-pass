import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { generateQRCode } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await query(`
      SELECT id, student_id, name, department, contact, is_active, profile_picture, created_at
      FROM students 
      ORDER BY created_at DESC
    `);

    return NextResponse.json({ success: true, students: result.rows });
  } catch (error) {
    console.error('Students fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { student_id, name, department, contact, password } = await request.json();

    // Validate required fields
    if (!student_id || !name || !department || !contact || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check if student ID already exists
    const existingStudent = await query('SELECT id FROM students WHERE student_id = $1', [student_id]);
    if (existingStudent.rows.length > 0) {
      return NextResponse.json({ error: 'Student ID already exists' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Generate QR code with student details
    const qrCode = generateQRCode(student_id, name, department, contact);

    // Insert new student
    const result = await query(
      `INSERT INTO students (student_id, name, department, contact, password, qr_code)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [student_id, name, department, contact, hashedPassword, qrCode]
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Student added successfully',
      studentId: result.rows[0].id
    });
  } catch (error) {
    console.error('Student creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
