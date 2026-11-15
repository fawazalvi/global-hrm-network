import { NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { db } from '@/backend/db';
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from '@/backend/session';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const requireAdmin = Boolean(body?.requireAdmin);

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const user = await db.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    if (user.accountStatus === 'suspended') {
      return NextResponse.json(
        { error: 'Your account has been suspended.' },
        { status: 403 }
      );
    }

    if (requireAdmin && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Administrator access is required.' },
        { status: 403 }
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role,
      accountStatus: user.accountStatus,
      image: user.profilePhotoURL,
    };

    const token = await createSessionToken(sessionUser);
    const forwardedProto = req.headers.get('x-forwarded-proto');
    const isHttps = forwardedProto === 'https' || req.url.startsWith('https://');

    const response = NextResponse.json({
      success: true,
      user: sessionUser,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' && isHttps,
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Unable to sign in right now. Please try again.' },
      { status: 500 }
    );
  }
}
