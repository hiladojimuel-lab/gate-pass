import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/database';
import { generateQRCode } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { studentId, name, department, contact, password } = await request.json();

    // Validate required fields
    if (!studentId || !name || !department || !contact || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check if student ID already exists
    const existingStudent = await query('SELECT id FROM students WHERE student_id = $1', [studentId]);
    if (existingStudent.rows.length > 0) {
      return NextResponse.json({ error: 'Student ID already exists' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Generate QR code with student details
    const qrCode = generateQRCode(studentId, name, department, contact);

    // Insert new student
    const result = await query(
      `INSERT INTO students (student_id, name, department, contact, password, qr_code)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [studentId, name, department, contact, hashedPassword, qrCode]
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Student registered successfully',
      studentId: result.rows[0].id
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
