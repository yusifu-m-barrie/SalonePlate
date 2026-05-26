'use client';

import { useModalStore } from '@/stores/modalStore';

export function AppModal() {
  const { visible, title, message, buttons, hide } = useModalStore();
  if (!visible) return null;

  const onPress = (btn: (typeof buttons)[0]) => {
    hide();
    setTimeout(() => btn.onPress?.(), 0);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70" onClick={hide}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-brand-dark p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {message ? <p className="text-brand-gray text-sm mt-2 leading-relaxed">{message}</p> : null}
        <div className="flex flex-wrap justify-end gap-2 mt-6">
          {buttons.map((btn, i) => (
            <button
              key={`${btn.text}-${i}`}
              type="button"
              onClick={() => onPress(btn)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                btn.style === 'cancel'
                  ? 'border border-white/20 text-white'
                  : btn.style === 'destructive'
                    ? 'border border-red-500/50 text-red-400'
                    : 'gold-gradient text-brand-dark'
              }`}
            >
              {btn.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
