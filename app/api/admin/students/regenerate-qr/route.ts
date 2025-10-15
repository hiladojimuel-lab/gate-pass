import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { verifyToken } from '@/lib/auth';
import { generateQRCode } from '@/lib/auth';

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

    const { studentId } = await request.json();

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    // Get student details
    const studentResult = await query('SELECT * FROM students WHERE student_id = $1', [studentId]);
    const student = studentResult.rows[0];

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Generate new QR code with student details
    const newQRCode = generateQRCode(student.student_id, student.name, student.department, student.contact);

    // Update the QR code in database
    await query(
      'UPDATE students SET qr_code = $1 WHERE student_id = $2',
      [newQRCode, studentId]
    );

    return NextResponse.json({
      success: true,
      message: 'QR code regenerated successfully',
      qrCode: newQRCode
    });

  } catch (error) {
    console.error('QR code regeneration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Regenerate QR codes for all students
    const studentsResult = await query('SELECT * FROM students WHERE is_active = true');
    const students = studentsResult.rows;

    let updatedCount = 0;
    for (const student of students) {
      const newQRCode = generateQRCode(student.student_id, student.name, student.department, student.contact);
      await query(
        'UPDATE students SET qr_code = $1 WHERE id = $2',
        [newQRCode, student.id]
      );
      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `QR codes regenerated for ${updatedCount} students`,
      updatedCount
    });

  } catch (error) {
    console.error('Bulk QR code regeneration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
