import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../ui/Button';
import { colors, radius } from '../../constants/theme';
import { api } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiErrors';

type Props = {
  email: string;
  onEmailChange: (email: string) => void;
  code: string;
  onCodeChange: (code: string) => void;
  verified: boolean;
  onVerifiedChange: (verified: boolean) => void;
  onSendCode?: () => Promise<{
    devCode?: string;
    retryAfter?: number;
    delivery?: string;
    message?: string;
  }>;
};

const RESEND_DEFAULT = 60;

export function EmailVerificationField({
  email,
  onEmailChange,
  code,
  onCodeChange,
  verified,
  onVerifiedChange,
  onSendCode,
}: Props) {
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<TextInput>(null);
  const verifyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmailRef = useRef(email);

  const resetVerification = useCallback(
    (opts?: { keepCodeSent?: boolean }) => {
      if (verifyTimer.current) {
        clearTimeout(verifyTimer.current);
        verifyTimer.current = null;
      }
      onCodeChange('');
      onVerifiedChange(false);
      if (!opts?.keepCodeSent) {
        setCodeSent(false);
      }
      setResendIn(0);
      setChecking(false);
      setStatusMsg('');
      setErrorMsg('');
    },
    [onCodeChange, onVerifiedChange],
  );

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  useEffect(() => {
    const normalized = email.trim().toLowerCase();
    const prev = lastEmailRef.current.trim().toLowerCase();
    if (normalized !== prev) {
      lastEmailRef.current = email;
      resetVerification();
    }
  }, [email, resetVerification]);

  const verifyCode = useCallback(
    async (sixDigit: string) => {
      if (!email.includes('@') || sixDigit.length !== 6) return;
      setChecking(true);
      setErrorMsg('');
      try {
        const { data } = await api.post<{
          verified: boolean;
          message?: string;
          expiresIn?: number;
        }>('/auth/register/verify-code', {
          email: email.trim().toLowerCase(),
          code: sixDigit,
        });
        if (data.verified) {
          onVerifiedChange(true);
          setStatusMsg('Email verified');
          setErrorMsg('');
        } else {
          onVerifiedChange(false);
          onCodeChange('');
          setResendIn(0);
          setErrorMsg(data.message || 'Invalid or expired code. Tap below to send a new code.');
        }
      } catch (err: unknown) {
        onVerifiedChange(false);
        onCodeChange('');
        setResendIn(0);
        setErrorMsg(getApiErrorMessage(err, 'Could not verify code. Request a new code below.'));
      } finally {
        setChecking(false);
      }
    },
    [email, onVerifiedChange, onCodeChange],
  );

  useEffect(() => {
    if (verifyTimer.current) clearTimeout(verifyTimer.current);
    if (verified || !codeSent) return;
    if (code.length === 6) {
      verifyTimer.current = setTimeout(() => verifyCode(code), 350);
    } else if (code.length === 0) {
      onVerifiedChange(false);
    }
    return () => {
      if (verifyTimer.current) clearTimeout(verifyTimer.current);
    };
  }, [code, codeSent, verified, verifyCode, onVerifiedChange]);

  const handleSend = async () => {
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Enter a valid email address');
      return;
    }
    setSending(true);
    resetVerification({ keepCodeSent: false });
    try {
      let result: {
        devCode?: string;
        retryAfter?: number;
        delivery?: string;
        message?: string;
      } = {};
      if (onSendCode) {
        result = (await onSendCode()) || {};
      } else {
        const { data } = await api.post<{
          message: string;
          devCode?: string;
          retryAfter?: number;
          delivery?: string;
        }>('/auth/register/send-code', { email: email.trim().toLowerCase() });
        result = data;
      }
      if (result.devCode) onCodeChange(result.devCode);
      setStatusMsg(
        result.delivery === 'smtp'
          ? 'Code sent — check your inbox (and spam)'
          : result.message || 'Code ready — check API console if email was not configured',
      );
      setResendIn(result.retryAfter ?? RESEND_DEFAULT);
      setCodeSent(true);
      setTimeout(() => inputRef.current?.focus(), 300);
    } catch (err: unknown) {
      const ax = err as {
        response?: { status?: number; data?: { retryAfter?: number; message?: string } };
      };
      resetVerification();
      if (ax.response?.status === 429 && ax.response.data?.retryAfter) {
        setResendIn(ax.response.data.retryAfter);
        setCodeSent(true);
      }
      setErrorMsg(getApiErrorMessage(err, 'Could not send code'));
    } finally {
      setSending(false);
    }
  };

  const canSendCode = !sending && !verified && resendIn <= 0;

  const digits = code.padEnd(6, ' ').split('').slice(0, 6);

  return (
    <View>
      <TextInput
        placeholder="Email *"
        placeholderTextColor={colors.softGray}
        value={email}
        onChangeText={(v) => onEmailChange(v)}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!verified}
      />

      <Button
        title={
          resendIn > 0
            ? `Resend code in ${resendIn}s`
            : codeSent
              ? 'Resend verification code'
              : 'Send verification code'
        }
        onPress={handleSend}
        loading={sending}
        variant="outline"
        disabled={!canSendCode}
      />

      {codeSent && !verified && (
        <>
          <Text style={styles.label}>Enter 6-digit code</Text>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.otpRow}
            onPress={() => inputRef.current?.focus()}
          >
            {digits.map((d, i) => (
              <View key={i} style={[styles.otpBox, code.length === i && styles.otpBoxActive]}>
                <Text style={styles.otpDigit}>{d.trim()}</Text>
              </View>
            ))}
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={(v) => {
              onCodeChange(v.replace(/\D/g, '').slice(0, 6));
              if (errorMsg) setErrorMsg('');
            }}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.hiddenInput}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
          />
          {checking && (
            <View style={styles.checkingRow}>
              <ActivityIndicator size="small" color={colors.gold} />
              <Text style={styles.checkingText}>Verifying…</Text>
            </View>
          )}
        </>
      )}

      {verified && (
        <View style={styles.verifiedRow}>
          <Ionicons name="checkmark-circle" size={22} color="#4ADE80" />
          <Text style={styles.verifiedText}>Email verified — you can create your account</Text>
        </View>
      )}

      {statusMsg ? <Text style={styles.ok}>{statusMsg}</Text> : null}
      {errorMsg ? <Text style={styles.err}>{errorMsg}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    color: colors.white,
    marginBottom: 10,
  },
  label: { color: colors.softGray, fontSize: 13, marginBottom: 8, marginTop: 4 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  otpBox: {
    flex: 1,
    aspectRatio: 0.85,
    maxWidth: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: { borderColor: colors.gold },
  otpDigit: { color: colors.white, fontSize: 22, fontWeight: '700' },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0, width: 0 },
  checkingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  checkingText: { color: colors.softGray, fontSize: 13 },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: 'rgba(74,222,128,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.35)',
  },
  verifiedText: { color: '#86EFAC', fontSize: 14, flex: 1 },
  ok: { color: colors.softGray, fontSize: 12, marginTop: 8 },
  err: { color: '#FCA5A5', fontSize: 13, marginTop: 8 },
});
