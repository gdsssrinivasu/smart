import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { TimetableGenerator } from "./components/TimetableGenerator";
import { TimetableHistory } from "./components/TimetableHistory";
import { useState } from "react";

export default function App() {
  const [activeTab, setActiveTab] = useState<'generator' | 'history'>('generator');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-blue-600">Smart Timetable Generator</h2>
        <Authenticated>
          <div className="flex items-center gap-4">
            <nav className="flex gap-2">
              <button
                onClick={() => setActiveTab('generator')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'generator'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                Generator
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                History
              </button>
            </nav>
            <SignOutButton />
          </div>
        </Authenticated>
      </header>
      
      <main className="flex-1 p-6">
        <Content activeTab={activeTab} />
      </main>
      
      <Toaster />
    </div>
  );
}

function Content({ activeTab }: { activeTab: 'generator' | 'history' }) {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Unauthenticated>
        <div className="max-w-md mx-auto mt-20">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Smart Timetable Generator
            </h1>
            <p className="text-lg text-gray-600">
              Generate optimized class schedules with AI algorithms
            </p>
          </div>
          <SignInForm />
        </div>
      </Unauthenticated>

      <Authenticated>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {loggedInUser?.email?.split('@')[0] || 'User'}!
          </h1>
          <p className="text-gray-600">
            Create and manage intelligent timetables for your institution
          </p>
        </div>

        {activeTab === 'generator' ? <TimetableGenerator /> : <TimetableHistory />}
      </Authenticated>
    </div>
  );
}
