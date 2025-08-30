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

    // Get user data from Clerk
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

    // Check if user already exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (existingUser) {
      // Update user if needed
      const primaryEmail = clerkUser.email_addresses.find((email: any) => email.id === clerkUser.primary_email_address_id);
      
      if (existingUser.email !== primaryEmail?.email_address ||
          existingUser.name !== `${clerkUser.first_name} ${clerkUser.last_name}`.trim() ||
          existingUser.image !== clerkUser.image_url) {
        
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            email: primaryEmail?.email_address || existingUser.email,
            name: `${clerkUser.first_name} ${clerkUser.last_name}`.trim() || existingUser.name,
            image: clerkUser.image_url || existingUser.image
          }
        });

        return NextResponse.json({ user: updatedUser, action: 'updated' });
      }

      return NextResponse.json({ user: existingUser, action: 'exists' });
    }

    // Create new user
    const primaryEmail = clerkUser.email_addresses.find((email: any) => email.id === clerkUser.primary_email_address_id);
    
    const newUser = await prisma.user.create({
      data: {
        id: userId,
        email: primaryEmail?.email_address || '',
        name: `${clerkUser.first_name} ${clerkUser.last_name}`.trim(),
        image: clerkUser.image_url
      }
    });

    // Create personal workspace for the new user
    const personalWorkspace = await prisma.workspace.create({
      data: {
        name: `${newUser.name}'s Personal Workspace`,
        description: 'Your personal workspace',
        ownerId: newUser.id,
        isPersonal: true,
        columns: {
          create: [
            { name: 'Todo', order: 1 },
            { name: 'Done', order: 2 }
          ]
        },
        members: {
          create: {
            userId: newUser.id,
            role: 'ADMIN'
          }
        }
      },
      include: {
        columns: true,
        members: true
      }
    });

    return NextResponse.json({
      user: newUser,
      workspace: personalWorkspace,
      action: 'created'
    });

  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}