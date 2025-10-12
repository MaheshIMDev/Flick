'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import { ArrowRight, Lock, Zap, Shield, MessageCircle } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-black -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center animate-fade-in">
            {/* Icon */}
            <div className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-blue-600 to-purple-600 mb-8 shadow-2xl">
              <MessageCircle className="w-16 h-16 text-white" strokeWidth={2} />
            </div>
            
            {/* Title */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6">
              Secure Messaging
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Built for Privacy
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-12">
              End-to-end encrypted messaging with voice and video calls. 
              Your conversations stay private, always.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                variant="primary"
                size="lg"
                rightIcon={<ArrowRight size={20} />}
                onClick={() => router.push('/login')}
                className="w-full sm:w-auto"
              >
                Get Started Free
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push('/login')}
                className="w-full sm:w-auto"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Why Choose SecureChat?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Privacy-first messaging that puts you in control
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Lock size={32} />}
            title="End-to-End Encrypted"
            description="Your messages are secured with military-grade encryption. Only you and your recipient can read them."
          />
          <FeatureCard
            icon={<Zap size={32} />}
            title="Lightning Fast"
            description="Real-time messaging with instant delivery. Connect with friends and family without delays."
          />
          <FeatureCard
            icon={<Shield size={32} />}
            title="Privacy First"
            description="We don't store your messages on our servers. Your data belongs to you, not us."
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-600 dark:text-gray-400">
            <p>&copy; 2025 SecureChat. All rights reserved.</p>
            <p className="mt-2 text-sm">Built with privacy and security in mind.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="p-8 rounded-2xl backdrop-blur-lg bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
      <div className="inline-flex p-4 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}
