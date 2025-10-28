// src/app/page.tsx
import { currentUser } from '@clerk/nextjs/server'
import { SignIn } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function HomePage() {
  const user = await currentUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="w-full max-w-5xl px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-4">
            Welcome to <span className="text-primary">Tickr</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            The modern kanban-style task manager for teams and individuals
          </p>
          <div className="flex justify-center gap-3">
            <Button className="bg-primary text-primary-foreground">Get Started</Button>
            <Button variant="outline">Learn More</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-center gap-2 text-base">
                <span className="text-primary" aria-hidden>✅</span> Task Management
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground text-center">
              Organize tasks with drag-and-drop simplicity
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-center gap-2 text-base">
                <span className="text-primary" aria-hidden>👥</span> Team Collaboration
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground text-center">
              Work together with your team in real-time
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-center gap-2 text-base">
                <span className="text-primary" aria-hidden>📊</span> Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground text-center">
              Track progress with detailed insights
            </CardContent>
          </Card>
        </div>

        <div id="signin" className="mt-12 flex justify-center">
          <div className="rounded-lg border border-border bg-card p-4">
            <SignIn />
          </div>
        </div>
      </div>
    </div>
  )
}
