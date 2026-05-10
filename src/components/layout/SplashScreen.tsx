'use client'

import { useEffect, useState } from 'react'

export function SplashScreen() {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const shown = sessionStorage.getItem('nous-splash')
    if (shown) return

    sessionStorage.setItem('nous-splash', '1')
    setVisible(true)

    const exitTimer = setTimeout(() => setExiting(true), 1300)
    const doneTimer = setTimeout(() => setVisible(false), 2100)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(doneTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <>
      <style>{`
        @keyframes nous-splash-mark {
          from { opacity: 0; transform: scale(0.82); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes nous-splash-word {
          from { opacity: 0; transform: translateX(10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes nous-splash-line {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes nous-splash-tag {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .nous-s-mark {
          animation: nous-splash-mark 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .nous-s-word {
          animation: nous-splash-word 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
        }
        .nous-s-line {
          animation: nous-splash-line 0.3s ease 0.65s both;
          transform-origin: left;
        }
        .nous-s-tag {
          animation: nous-splash-tag 0.4s ease 0.85s both;
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: '#0C0D0F',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 750ms ease',
          opacity: exiting ? 0 : 1,
          pointerEvents: exiting ? 'none' : 'all',
        }}
      >
        {/* Logo: Mark + Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="nous-s-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/nous-mark-white.svg"
              alt="NOUS"
              width={52}
              height={52}
              style={{ display: 'block' }}
            />
          </div>
          <div className="nous-s-word" style={{ position: 'relative', paddingBottom: '8px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/nous-wordmark-white.svg"
              alt="NOUS"
              width={120}
              height={28}
              style={{ display: 'block' }}
            />
            <div
              className="nous-s-line"
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                backgroundColor: '#ff8210',
                borderRadius: '1px',
              }}
            />
          </div>
        </div>

        {/* Tagline */}
        <p
          className="nous-s-tag"
          style={{
            marginTop: '20px',
            color: '#4A4F57',
            fontSize: '11px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Turn Data into Decisions
        </p>
      </div>
    </>
  )
}
