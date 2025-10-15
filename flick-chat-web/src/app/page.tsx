'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import { ArrowRight, MessageCircle, Video, Zap, Shield } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-black -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center animate-fade-in">
            <div className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-blue-600 to-purple-600 mb-8 shadow-2xl">
              <MessageCircle className="w-16 h-16 text-white" strokeWidth={2} />
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6">
              Welcome to FlickChat
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Connect Instantly
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-12">
              Real-time messaging with HD voice and video calls. 
              Connect with friends instantly.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                variant="primary"
                size="lg"
                rightIcon={<ArrowRight size={20} />}
                onClick={() => router.push('/signup')}
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

            <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">100%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Free Forever</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">HD</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Video Calls</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">Fast</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Real-time</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features - ONLY 4 Cards (Removed Group Chats) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Why Choose FlickChat?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Simple, fast, and reliable messaging
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<MessageCircle size={32} />}
            title="Real-time Chat"
            description="Send and receive messages instantly with zero delay."
          />
          <FeatureCard
            icon={<Video size={32} />}
            title="HD Calls"
            description="Crystal clear voice and video calls with anyone."
          />
          <FeatureCard
            icon={<Shield size={32} />}
            title="Secure"
            description="Industry-standard security keeps your chats private."
          />
          <FeatureCard
            icon={<Zap size={32} />}
            title="Lightning Fast"
            description="Optimized for speed. No lag, no waiting."
          />
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-blue-100 mb-8">
            Join FlickChat and start connecting today
          </p>
          <Button
            variant="outline"
            size="lg"
            rightIcon={<ArrowRight size={20} />}
            onClick={() => router.push('/signup')}
            className="bg-white text-blue-600 hover:bg-gray-100 border-0"
          >
            Create Free Account
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-600 dark:text-gray-400">
            <p>&copy; 2025 FlickChat. All rights reserved.</p>
            <p className="mt-2 text-sm">Connecting people instantly, everywhere.</p>
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
      <p className="text-gray-600 dark:text-gray-400 text-sm">
        {description}
      </p>
    </div>
  );
}
