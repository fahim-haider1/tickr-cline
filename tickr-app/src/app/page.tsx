// src/app/page.tsx
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const user = await currentUser()
  
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-blue-600">Tickr</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            The modern kanban-style task manager for teams and individuals
          </p>
          <div className="flex justify-center space-x-4">
            <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Get Started
            </button>
            <button className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
              Learn More
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <span className="text-blue-600 font-bold">✓</span>
            </div>
            <h3 className="font-semibold mb-2">Task Management</h3>
            <p className="text-gray-600">Organize tasks with drag-and-drop simplicity</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <span className="text-green-600 font-bold">👥</span>
            </div>
            <h3 className="font-semibold mb-2">Team Collaboration</h3>
            <p className="text-gray-600">Work together with your team in real-time</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <span className="text-purple-600 font-bold">📊</span>
            </div>
            <h3 className="font-semibold mb-2">Analytics</h3>
            <p className="text-gray-600">Track progress with detailed insights</p>
          </div>
        </div>
      </div>
    </div>
  )
}