// src/app/api/sync-user/route.ts
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (existingUser) {
      // Update user if needed
      if (existingUser.email !== user.emailAddresses[0]?.emailAddress || 
          existingUser.name !== `${user.firstName} ${user.lastName}`.trim() ||
          existingUser.image !== user.imageUrl) {
        
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            email: user.emailAddresses[0]?.emailAddress || existingUser.email,
            name: `${user.firstName} ${user.lastName}`.trim() || existingUser.name,
            image: user.imageUrl || existingUser.image
          }
        });

        return NextResponse.json({ user: updatedUser, action: 'updated' });
      }

      return NextResponse.json({ user: existingUser, action: 'exists' });
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        name: `${user.firstName} ${user.lastName}`.trim(),
        image: user.imageUrl
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