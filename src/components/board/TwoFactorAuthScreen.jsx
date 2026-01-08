import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Mail, Lock, AlertCircle, CheckCircle } from "lucide-react";
import { requestBoardAccessPin } from "@/functions/requestBoardAccessPin";
import { verifyBoardAccessPin } from "@/functions/verifyBoardAccessPin";

export default function TwoFactorAuthScreen({ boardId, boardName, onAccessGranted }) {
  const [pinCode, setPinCode] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleRequestCode = async () => {
    setIsRequesting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await requestBoardAccessPin({ boardId });
      
      if (response.data.success) {
        setMessage('Access code sent to ben@thinkengine.co. Please check your email.');
        setCooldown(120); // 2 minutes cooldown
      } else {
        setError(response.data.error || 'Failed to send access code');
        if (response.data.retryAfter) {
          setCooldown(response.data.retryAfter);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to request access code');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleVerifyCode = async () => {
    if (pinCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await verifyBoardAccessPin({ boardId, pinCode });
      
      if (response.data.success) {
        setMessage('Access granted! Loading board...');
        // Store access token in sessionStorage (cleared when browser is closed)
        sessionStorage.setItem(`board_access_${boardId}`, 'granted');
        setTimeout(() => {
          onAccessGranted();
        }, 1000);
      } else {
        setError(response.data.error || 'Invalid access code');
        setPinCode("");
      }
    } catch (err) {
      setError(err.message || 'Failed to verify access code');
      setPinCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPinCode(value);
    setError(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && pinCode.length === 6 && !isVerifying) {
      handleVerifyCode();
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-4">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="space-y-3 pb-6 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Secure Board Access
          </CardTitle>
          <CardDescription className="text-base">
            For security, please request an access code to view<br/>
            <span className="font-semibold text-slate-700">{boardName}</span>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">How it works:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-800">
                <li>Click "Request Access Code" below</li>
                <li>A 6-digit code will be sent to ben@thinkengine.co</li>
                <li>Enter the code to gain access</li>
              </ol>
            </div>
          </div>

          {/* Access Code Input */}
          <div className="space-y-2">
            <label htmlFor="pin" className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Access Code
            </label>
            <Input
              id="pin"
              type="text"
              inputMode="numeric"
              placeholder="Enter 6-digit code"
              value={pinCode}
              onChange={handlePinChange}
              onKeyPress={handleKeyPress}
              disabled={isVerifying}
              className="text-center text-2xl font-mono tracking-widest h-14"
              maxLength={6}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">{message}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleVerifyCode}
              disabled={pinCode.length !== 6 || isVerifying}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg"
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </Button>

            <Button
              onClick={handleRequestCode}
              disabled={isRequesting || cooldown > 0}
              variant="outline"
              className="w-full h-11 border-2"
            >
              {isRequesting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mr-2" />
                  Sending...
                </>
              ) : cooldown > 0 ? (
                `Wait ${cooldown}s before requesting again`
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Request New Code
                </>
              )}
            </Button>
          </div>

          {/* Security Notice */}
          <div className="text-xs text-center text-slate-500 pt-2">
            <Lock className="w-3 h-3 inline mr-1" />
            Access codes expire in 10 minutes
          </div>
        </CardContent>
      </Card>
    </div>
  );
}