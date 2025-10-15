import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const studentId = params.id;

    // Check if this is a status-only update
    if (body.hasOwnProperty('is_active') && Object.keys(body).length === 1) {
      // Update student status only
      const result = await query(
        `UPDATE students 
         SET is_active = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE student_id = $2
         RETURNING id`,
        [body.is_active, studentId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Student status updated successfully'
      });
    }

    // Full student update
    const { name, department, contact, password, is_active } = body;

    // Validate required fields
    if (!name || !department || !contact) {
      return NextResponse.json({ error: 'Name, department, and contact are required' }, { status: 400 });
    }

    // Check if student exists
    const existingStudent = await query('SELECT id FROM students WHERE student_id = $1', [studentId]);
    if (existingStudent.rows.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Build update query dynamically
    let updateFields = [];
    let values = [];
    let paramCount = 1;

    updateFields.push(`name = $${paramCount++}`);
    values.push(name);

    updateFields.push(`department = $${paramCount++}`);
    values.push(department);

    updateFields.push(`contact = $${paramCount++}`);
    values.push(contact);

    if (password) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync(password, 10);
      updateFields.push(`password = $${paramCount++}`);
      values.push(hashedPassword);
    }

    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(studentId);

    const result = await query(
      `UPDATE students 
       SET ${updateFields.join(', ')}
       WHERE student_id = $${paramCount}
       RETURNING id`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Student updated successfully'
    });
  } catch (error) {
    console.error('Student update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
