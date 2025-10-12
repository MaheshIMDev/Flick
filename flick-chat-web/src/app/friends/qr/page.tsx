'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, Scan, ArrowLeft, RefreshCw, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import api from '@/lib/api';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function QRPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'generate' | 'scan'>('generate');
  const [qrCodeDataURL, setQrCodeDataURL] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanInput, setScanInput] = useState('');

  useEffect(() => {
    if (mode === 'generate') {
      generateQR();
    }
  }, [mode]);

  const generateQR = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/friends/qr/generate', {
        max_uses: 1,
        expires_in_minutes: 60,
      });

      setQrValue(data.qr_code);
      
      const dataURL = await QRCode.toDataURL(data.qr_code, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      
      setQrCodeDataURL(dataURL);
      toast.success('QR code generated!');
    } catch (error) {
      toast.error('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    if (!scanInput.trim()) {
      toast.error('Please enter QR code value');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/friends/qr/scan', {
        qr_code_value: scanInput,
      });

      toast.success(data.message);
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to scan QR code');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(qrValue);
    toast.success('QR code copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-[#111b21] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft size={20} />}
            onClick={() => router.back()}
            className="text-[#8696a0]"
          >
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-[#e9edef]">
            QR Code
          </h1>
          <div className="w-20" />
        </div>

        {/* Mode Toggle */}
        <div className="flex rounded-xl bg-[#202c33] p-1 mb-6">
          <button
            onClick={() => setMode('generate')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg transition-all ${
              mode === 'generate'
                ? 'bg-[#00a884] text-white'
                : 'text-[#8696a0]'
            }`}
          >
            <QrCode size={20} />
            <span className="font-semibold">My QR</span>
          </button>
          <button
            onClick={() => setMode('scan')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg transition-all ${
              mode === 'scan'
                ? 'bg-[#00a884] text-white'
                : 'text-[#8696a0]'
            }`}
          >
            <Scan size={20} />
            <span className="font-semibold">Scan QR</span>
          </button>
        </div>

        {/* Content */}
        <div className="bg-[#202c33] rounded-2xl p-8">
          {mode === 'generate' ? (
            <div className="text-center">
              <h2 className="text-xl font-semibold text-[#e9edef] mb-2">
                Show QR Code to Friend
              </h2>
              <p className="text-[#8696a0] text-sm mb-8">
                Your friend can scan this code to add you instantly
              </p>

              {loading ? (
                <div className="flex items-center justify-center h-[360px]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00a884]" />
                </div>
              ) : qrCodeDataURL ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center"
                >
                  <div className="p-4 bg-white rounded-2xl mb-4 mx-auto">
                    <img src={qrCodeDataURL} alt="QR Code" className="w-[300px] h-[300px]" />
                  </div>
                  <p className="text-xs text-[#8696a0] mb-6">
                    Expires in 1 hour • Single use
                  </p>
                  
                  <div className="flex gap-3 w-full max-w-sm">
                    <Button
                      variant="outline"
                      leftIcon={<Copy size={18} />}
                      onClick={copyToClipboard}
                      className="flex-1 border-[#2a3942] text-[#e9edef]"
                    >
                      Copy Code
                    </Button>
                    <Button
                      variant="outline"
                      leftIcon={<RefreshCw size={18} />}
                      onClick={generateQR}
                      loading={loading}
                      className="flex-1 border-[#2a3942] text-[#e9edef]"
                    >
                      Refresh
                    </Button>
                  </div>
                </motion.div>
              ) : null}
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold text-[#e9edef] mb-2">
                Scan Friend's QR Code
              </h2>
              <p className="text-[#8696a0] text-sm mb-6">
                Enter the QR code value to add a friend
              </p>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Paste QR code value here..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#2a3942] border-2 border-transparent text-[#e9edef] focus:border-[#00a884] focus:outline-none transition-all placeholder-[#8696a0]"
                />

                <Button
                  variant="primary"
                  leftIcon={<Scan size={18} />}
                  onClick={handleScan}
                  loading={loading}
                  className="w-full"
                >
                  Add Friend
                </Button>
              </div>

              <div className="mt-6 p-4 bg-[#2a3942] rounded-xl">
                <p className="text-sm text-[#8696a0]">
                  <strong className="text-[#e9edef]">Tip:</strong> Ask your friend to show you their QR code, 
                  then copy and paste the code value here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
