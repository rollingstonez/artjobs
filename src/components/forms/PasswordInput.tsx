"use client";
// 비밀번호 입력칸 — 오른쪽 눈 버튼으로 보이기/숨기기. 가입·로그인·재설정·설정에서 같이 쓴다.

import { useState } from "react";
import { inputClass } from "@/components/forms/ui";

export default function PasswordInput({
  name,
  autoComplete,
  minLength,
  placeholder,
  required = true,
}: {
  name: string;
  autoComplete: "new-password" | "current-password";
  minLength?: number;
  placeholder?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        name={name}
        type={show ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`${inputClass} pr-11`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-stone-400 hover:text-stone-700"
      >
        {show ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.7 9.7 0 0 1 12 4.9c5 0 8.6 4 9.8 7.1-.4 1-1.2 2.4-2.4 3.6M6.2 6.2C4.3 7.6 3 9.6 2.2 12c1.2 3.1 4.8 7.1 9.8 7.1 1.7 0 3.2-.5 4.6-1.2" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M2.2 12C3.4 8.9 7 4.9 12 4.9s8.6 4 9.8 7.1c-1.2 3.1-4.8 7.1-9.8 7.1S3.4 15.1 2.2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
