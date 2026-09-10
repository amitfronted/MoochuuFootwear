'use client';

import React, { useEffect, useRef, useState } from 'react';

const OtpBox = ({ length = 6, onChange, autoFocus = true }) => {
  const [otp, setOtp] = useState(() => new Array(length).fill(''));

  const inputRefs = useRef([]);

  useEffect(() => {
    if (autoFocus) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  const updateOtp = (newOtp) => {
    setOtp(newOtp);

    const otpValue = newOtp.join('');

    onChange?.(otpValue);

    // if (otpValue.length === length) {
    //   onComplete?.(otpValue);
    // }
  };

  const handleChange = (e, index) => {
    const value = e.target.value;

    if (!/^\d*$/.test(value)) {
      return;
    }

    const digit = value.slice(-1);

    const newOtp = [...otp];

    newOtp[index] = digit;

    updateOtp(newOtp);

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      e.preventDefault();

      const newOtp = [...otp];

      if (otp[index]) {
        newOtp[index] = '';
        updateOtp(newOtp);
      } else if (index > 0) {
        newOtp[index - 1] = '';
        updateOtp(newOtp);

        inputRefs.current[index - 1]?.focus();
      }

      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();

      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }

      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();

      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      return;
    }

    if (e.key === 'Delete') {
      e.preventDefault();

      const newOtp = [...otp];

      newOtp[index] = '';

      updateOtp(newOtp);
    }
  };

  const handlePaste = (e, index) => {
    e.preventDefault();

    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');

    if (!pastedData) {
      return;
    }

    const newOtp = [...otp];

    pastedData
      .slice(0, length - index)
      .split('')
      .forEach((digit, i) => {
        newOtp[index + i] = digit;
      });

    updateOtp(newOtp);

    const nextEmptyIndex = newOtp.findIndex((value) => !value);

    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[length - 1]?.focus();
    }
  };

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-5">
      {otp.map((value, index) => (
        <input
          key={index}
          ref={(element) => {
            inputRefs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={value}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={(e) => handlePaste(e, index)}
          aria-label={`OTP digit ${index + 1}`}
          className="h-10 w-10 rounded-md border border-gray-300 text-center text-lg font-semibold outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 sm:h-12 sm:w-12"
        />
      ))}
    </div>
  );
};

export default OtpBox;
