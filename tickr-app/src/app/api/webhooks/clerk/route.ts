import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { prisma } from '@/lib/prisma'

type WebhookEvent = {
  data: {
    id: string
    email_addresses: Array<{
      email_address: string
      id: string
    }>
    first_name?: string
    last_name?: string
    image_url?: string
  }
  type: string
}

export async function POST(request: NextRequest) {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

    if (!WEBHOOK_SECRET) {
      throw new Error('Please add CLERK_WEBHOOK_SECRET to your environment variables')
    }

    // Get headers
    const headerPayload = await headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new NextResponse('Error occurred -- no svix headers', {
        status: 400,
      })
    }

    // Get body
    const payload = await request.json()
    const body = JSON.stringify(payload)

    // Create webhook instance
    const webhook = new Webhook(WEBHOOK_SECRET)

    let event: WebhookEvent

    // Verify webhook
    try {
      event = webhook.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as WebhookEvent
    } catch (err) {
      console.error('Error verifying webhook:', err)
      return new NextResponse('Error occurred', { status: 400 })
    }

    // Handle the webhook
    const { type, data } = event

    if (type === 'user.created') {
      await handleUserCreated(data)
    } else if (type === 'user.updated') {
      await handleUserUpdated(data)
    } else if (type === 'user.deleted') {
      await handleUserDeleted(data)
    }

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

async function handleUserCreated(data: WebhookEvent['data']) {
  try {
    const email = data.email_addresses[0]?.email_address || ''
    const name = data.first_name && data.last_name 
      ? `${data.first_name} ${data.last_name}` 
      : data.first_name || null

    // Create user in database
    const user = await prisma.user.create({
      data: {
        id: data.id,
        email,
        name,
        image: data.image_url || null,
      },
    })

    // Create personal workspace
    await prisma.workspace.create({
      data: {
        name: 'Personal',
        description: 'Your personal workspace',
        ownerId: user.id,
        columns: {
          create: [
            { name: 'To do', order: 0 },
            { name: 'Done', order: 1 },
          ]
        }
      },
    })

    console.log('User created:', user.id)
  } catch (error) {
    console.error('Error creating user:', error)
  }
}

async function handleUserUpdated(data: WebhookEvent['data']) {
  try {
    const email = data.email_addresses[0]?.email_address || ''
    const name = data.first_name && data.last_name 
      ? `${data.first_name} ${data.last_name}` 
      : data.first_name || null

    await prisma.user.update({
      where: { id: data.id },
      data: {
        email,
        name,
        image: data.image_url || null,
      },
    })

    console.log('User updated:', data.id)
  } catch (error) {
    console.error('Error updating user:', error)
  }
}

async function handleUserDeleted(data: WebhookEvent['data']) {
  try {
    await prisma.user.delete({
      where: { id: data.id },
    })

    console.log('User deleted:', data.id)
  } catch (error) {
    console.error('Error deleting user:', error)
  }
}
