import { NextRequest, NextResponse } from 'next/server';
import { authenticateStudent, authenticateAdmin, generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import db from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { studentId, username, password, role } = await request.json();

    let user;
    
    if (role === 'student') {
      if (!studentId || !password) {
        return NextResponse.json({ error: 'Student ID and password are required' }, { status: 400 });
      }
      user = await authenticateStudent(studentId, password);
    } else if (role === 'admin') {
      if (!username || !password) {
        return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
      }
      user = await authenticateAdmin(username, password);
    } else {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateToken(user);

    const response = NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        student_id: user.student_id,
        username: user.username,
        name: user.name,
        department: user.department,
        contact: user.contact,
        role: user.role
      }
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400 // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
