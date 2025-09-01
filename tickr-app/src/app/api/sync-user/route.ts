// src/app/api/sync-user/route.ts

import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request as any);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data from Clerk (server-to-server)
    const response = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user from Clerk');
    }

    const clerkUser = await response.json();
    const primaryEmail = clerkUser.email_addresses.find(
      (email: any) => email.id === clerkUser.primary_email_address_id
    );
    const name =
      `${clerkUser.first_name ?? ''} ${clerkUser.last_name ?? ''}`.trim() || null;
    const image = clerkUser.image_url || null;
    const email = primaryEmail?.email_address || '';

    // Upsert user in our DB (no workspace creation here)
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });

    if (existingUser) {
      if (
        existingUser.email !== email ||
        existingUser.name !== name ||
        existingUser.image !== image
      ) {
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { email, name, image },
        });
        return NextResponse.json({ user: updatedUser, action: 'updated' });
      }
      return NextResponse.json({ user: existingUser, action: 'exists' });
    }

    const newUser = await prisma.user.create({
      data: { id: userId, email, name, image },
    });

    return NextResponse.json({ user: newUser, action: 'created' });
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
