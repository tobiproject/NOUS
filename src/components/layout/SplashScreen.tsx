'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Phase = 'blocking' | 'animating' | 'exiting' | 'done'

export function SplashScreen() {
  // Start 'blocking': sofort schwarzer Screen → verhindert Login-Flash
  const [phase, setPhase] = useState<Phase>('blocking')

  useEffect(() => {
    const shown = sessionStorage.getItem('nous-splash-v4')

    if (shown) {
      // Schon gezeigt → sofort wegblenden (kein Flash, kein Delay)
      setPhase('done')
      return
    }

    sessionStorage.setItem('nous-splash-v4', '1')
    setPhase('animating')

    // Auth-State im Hintergrund laden während die Animation läuft
    const supabase = createClient()
    supabase.auth.getSession().catch(() => {})

    const exitTimer = setTimeout(() => setPhase('exiting'), 5000)
    const doneTimer = setTimeout(() => setPhase('done'), 5800)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(doneTimer)
    }
  }, [])

  if (phase === 'done') return null

  const DURATION = '5.8s'
  const EASE_LETTER = 'cubic-bezier(0.215, 0.61, 0.355, 1)'
  const EASE_TAG = 'cubic-bezier(0.19, 1, 0.22, 1)'

  const letter = (delayS: number) => ({
    animation: `nous-letter 0.87s ${EASE_LETTER} ${delayS}s both`,
    transformBox: 'fill-box' as const,
    transformOrigin: 'center' as const,
  })

  return (
    <>
      <style>{`
        @keyframes nous-bull {
          from { transform: scale(1.0) translateX(-18px); }
          to   { transform: scale(1.1) translateX(18px); }
        }
        @keyframes nous-bear {
          from { transform: scale(1.0) translateX(18px); }
          to   { transform: scale(1.1) translateX(-18px); }
        }
        @keyframes nous-letter {
          0%   { opacity: 0; filter: blur(16px); transform: scale(1.38); }
          27%  { opacity: 1; }
          100% { opacity: 1; filter: blur(0px); transform: scale(1.0); }
        }
        @keyframes nous-tagline {
          0%   { opacity: 0; filter: blur(9px); transform: scale(1.12); }
          35%  { opacity: 1; }
          100% { opacity: 1; filter: blur(0px); transform: scale(1.0); }
        }
        @keyframes nous-shimmer {
          from { left: -55%; }
          to   { left: 155%; }
        }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: '#0a0a0a', overflow: 'hidden',
        transition: phase === 'exiting' ? 'opacity 800ms ease' : 'none',
        opacity: phase === 'exiting' ? 0 : 1,
        pointerEvents: phase === 'exiting' ? 'none' : 'all',
      }}>

        {(phase === 'animating' || phase === 'exiting') && <>

        {/* Bulle (linke Hälfte) — bewegt sich nach rechts */}
        <div style={{ position: 'absolute', inset: 0, clipPath: 'inset(0 50% 0 0)' }}>
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bull-bear-bg.jpg" alt="" style={{
              width: '100%', height: '100%', objectFit: 'cover',
              filter: 'grayscale(1) brightness(0.38) contrast(1.3)',
              animation: `nous-bull ${DURATION} linear both`,
              transformOrigin: 'center center',
            }} />
          </div>
        </div>

        {/* Bär (rechte Hälfte) — bewegt sich nach links */}
        <div style={{ position: 'absolute', inset: 0, clipPath: 'inset(0 0 0 50%)' }}>
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bull-bear-bg.jpg" alt="" style={{
              width: '100%', height: '100%', objectFit: 'cover',
              filter: 'grayscale(1) brightness(0.38) contrast(1.3)',
              animation: `nous-bear ${DURATION} linear both`,
              transformOrigin: 'center center',
            }} />
          </div>
        </div>

        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 75% 70% at 50% 50%, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.82) 100%)',
        }} />

        {/* Shimmer */}
        <div style={{
          position: 'absolute', top: 0, width: '40%', height: '100%', pointerEvents: 'none',
          background: 'linear-gradient(110deg, transparent 15%, rgba(255,255,255,0.03) 50%, transparent 85%)',
          animation: `nous-shimmer ${DURATION} linear both`,
        }} />

        {/* NOUS Logo + Tagline */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg viewBox="60 110 1420 830" style={{ width: 'min(78%, 900px)', overflow: 'visible' }} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <clipPath id="nous-clip-splash">
                <rect x="0" width="1244" y="0" height="425" />
              </clipPath>
            </defs>

            {/* N — delay 0.17s */}
            <g style={letter(0.17)}>
              <g transform="matrix(1,0,0,1,128,439)"><g clipPath="url(#nous-clip-splash)"><g fill="#ffffff">
                <g transform="translate(0.754156,352.776993)">
                  <path d="M 70.59375 0 L 14.125 0 L 14.125 -254.140625 C 14.125 -261.898438 16.882812 -268.546875 22.40625 -274.078125 C 27.9375 -279.609375 34.585938 -282.375 42.359375 -282.375 C 50.117188 -282.375 56.820312 -279.550781 62.46875 -273.90625 L 240.015625 -96.359375 L 240.015625 -282.375 L 296.5 -282.375 L 296.5 -28.234375 C 296.5 -20.472656 293.734375 -13.828125 288.203125 -8.296875 C 282.671875 -2.765625 276.019531 0 268.25 0 C 260.488281 0 253.785156 -2.820312 248.140625 -8.46875 L 70.59375 -186.015625 Z" />
                </g>
              </g></g></g>
            </g>

            {/* O — delay 0.33s */}
            <g style={letter(0.33)}>
              <g transform="matrix(1,0,0,1,128,439)"><g clipPath="url(#nous-clip-splash)"><g fill="#ffffff">
                <g transform="translate(311.372377,352.776993)">
                  <path d="M 240.015625 0 L 70.59375 0 C 60.238281 0 50.765625 -2.523438 42.171875 -7.578125 C 33.585938 -12.640625 26.765625 -19.460938 21.703125 -28.046875 C 16.648438 -36.640625 14.125 -46.113281 14.125 -56.46875 L 14.125 -225.90625 C 14.125 -236.257812 16.648438 -245.726562 21.703125 -254.3125 C 26.765625 -262.90625 33.585938 -269.726562 42.171875 -274.78125 C 50.765625 -279.84375 60.238281 -282.375 70.59375 -282.375 L 240.015625 -282.375 C 250.367188 -282.375 259.835938 -279.84375 268.421875 -274.78125 C 277.015625 -269.726562 283.84375 -262.90625 288.90625 -254.3125 C 293.96875 -245.726562 296.5 -236.257812 296.5 -225.90625 L 296.5 -56.46875 C 296.5 -46.351562 293.96875 -37 288.90625 -28.40625 C 283.84375 -19.820312 277.078125 -12.941406 268.609375 -7.765625 C 260.140625 -2.585938 250.609375 0 240.015625 0 Z M 70.59375 -225.90625 L 70.59375 -56.46875 L 240.015625 -56.46875 L 240.015625 -225.90625 Z" />
                </g>
              </g></g></g>
            </g>

            {/* U — delay 0.50s */}
            <g style={letter(0.50)}>
              <g transform="matrix(1,0,0,1,128,439)"><g clipPath="url(#nous-clip-splash)"><g fill="#ffffff">
                <g transform="translate(621.990598,352.776993)">
                  <path d="M 240.015625 0 L 70.59375 0 C 60.238281 0 50.765625 -2.523438 42.171875 -7.578125 C 33.585938 -12.640625 26.765625 -19.460938 21.703125 -28.046875 C 16.648438 -36.640625 14.125 -46.113281 14.125 -56.46875 L 14.125 -282.375 L 70.59375 -282.375 L 70.59375 -56.46875 L 240.015625 -56.46875 L 240.015625 -282.375 L 296.5 -282.375 L 296.5 -56.46875 C 296.5 -46.113281 293.96875 -36.640625 288.90625 -28.046875 C 283.84375 -19.460938 277.015625 -12.640625 268.421875 -7.578125 C 259.835938 -2.523438 250.367188 0 240.015625 0 Z" />
                </g>
              </g></g></g>
            </g>

            {/* S — delay 0.67s */}
            <g style={letter(0.67)}>
              <g transform="matrix(1,0,0,1,128,439)"><g clipPath="url(#nous-clip-splash)"><g fill="#ffffff">
                <g transform="translate(932.608842,352.776993)">
                  <path d="M 296.5 -282.375 L 296.5 -225.90625 L 70.59375 -225.90625 L 70.59375 -169.421875 L 240.015625 -169.421875 C 250.367188 -169.421875 259.835938 -166.890625 268.421875 -161.828125 C 277.015625 -156.773438 283.84375 -149.953125 288.90625 -141.359375 C 293.96875 -132.773438 296.5 -123.304688 296.5 -112.953125 L 296.5 -56.46875 C 296.5 -46.113281 293.96875 -36.640625 288.90625 -28.046875 C 283.84375 -19.460938 277.015625 -12.640625 268.421875 -7.578125 C 259.835938 -2.523438 250.367188 0 240.015625 0 L 14.125 0 L 14.125 -56.46875 L 240.015625 -56.46875 L 240.015625 -112.953125 L 70.59375 -112.953125 C 60.238281 -112.953125 50.765625 -115.476562 42.171875 -120.53125 C 33.585938 -125.59375 26.765625 -132.414062 21.703125 -141 C 16.648438 -149.59375 14.125 -159.066406 14.125 -169.421875 L 14.125 -225.90625 C 14.125 -236.257812 16.648438 -245.726562 21.703125 -254.3125 C 26.765625 -262.90625 33.585938 -269.726562 42.171875 -274.78125 C 50.765625 -279.84375 60.238281 -282.375 70.59375 -282.375 Z" />
                </g>
              </g></g></g>
            </g>

            {/* Tagline — delay 1.47s */}
            <g style={{ animation: `nous-tagline 0.93s ${EASE_TAG} 1.47s both`, transformBox: 'fill-box', transformOrigin: 'center' }}>
              <g fill="#ff8210" transform="translate(151.253927,890.946455)"><path d="M 20.421875 0 L 20.421875 -57.5 L 1.140625 -57.5 L 1.140625 -64.890625 L 47.71875 -64.890625 L 47.71875 -57.5 L 28.4375 -57.5 L 28.4375 0 Z" /></g>
              <g fill="#ff8210" transform="translate(200.117768,890.946455)"><path d="M 15.671875 0 L 6.421875 -9.25 L 6.421875 -64.890625 L 14.4375 -64.890625 L 14.4375 -11.96875 L 19.28125 -7.125 L 42.609375 -7.125 L 47.453125 -11.96875 L 47.453125 -64.890625 L 55.46875 -64.890625 L 55.46875 -9.25 L 46.21875 0 Z" /></g>
              <g fill="#ff8210" transform="translate(262.011978,890.946455)"><path d="M 7.65625 0 L 7.65625 -64.890625 L 43.140625 -64.890625 L 52.296875 -55.640625 L 52.296875 -34.953125 L 43.140625 -25.703125 L 42.875 -25.703125 L 54.59375 0 L 45.703125 0 L 34.15625 -25.703125 L 15.671875 -25.703125 L 15.671875 0 Z M 15.671875 -32.84375 L 39.53125 -32.84375 L 44.28125 -37.6875 L 44.28125 -52.921875 L 39.53125 -57.765625 L 15.671875 -57.765625 Z" /></g>
              <g fill="#ff8210" transform="translate(321.617071,890.946455)"><path d="M 7.65625 0 L 7.65625 -64.890625 L 18.578125 -64.890625 L 47.546875 -12.671875 L 47.546875 -64.890625 L 55.5625 -64.890625 L 55.5625 0 L 46.046875 0 L 17.609375 -51.25 L 15.671875 -51.25 L 15.671875 0 Z" /></g>
              <g fill="#ff8210" transform="translate(404.37744,890.946455)"><path d="M 7.65625 0 L 7.65625 -64.890625 L 42.875 -64.890625 L 56.34375 -51.25 L 56.34375 -13.640625 L 42.875 0 Z M 15.671875 -7.125 L 39.265625 -7.125 L 48.34375 -16.375 L 48.34375 -48.515625 L 39.265625 -57.765625 L 15.671875 -57.765625 Z" /></g>
              <g fill="#ff8210" transform="translate(465.126977,890.946455)"><path d="M 1.234375 0 L 23.15625 -64.890625 L 35.578125 -64.890625 L 57.5 0 L 49.125 0 L 43.578125 -16.90625 L 15.140625 -16.90625 L 9.6875 0 Z M 17.515625 -23.953125 L 41.296875 -23.953125 L 30.375 -57.3125 L 28.34375 -57.3125 Z" /></g>
              <g fill="#ff8210" transform="translate(517.071797,890.946455)"><path d="M 20.421875 0 L 20.421875 -57.5 L 1.140625 -57.5 L 1.140625 -64.890625 L 47.71875 -64.890625 L 47.71875 -57.5 L 28.4375 -57.5 L 28.4375 0 Z" /></g>
              <g fill="#ff8210" transform="translate(559.155794,890.946455)"><path d="M 1.234375 0 L 23.15625 -64.890625 L 35.578125 -64.890625 L 57.5 0 L 49.125 0 L 43.578125 -16.90625 L 15.140625 -16.90625 L 9.6875 0 Z M 17.515625 -23.953125 L 41.296875 -23.953125 L 30.375 -57.3125 L 28.34375 -57.3125 Z" /></g>
              <g fill="#ff8210" transform="translate(637.426005,890.946455)"><path d="M 5.453125 0 L 5.453125 -7.390625 L 13.390625 -7.390625 L 13.390625 -57.5 L 5.453125 -57.5 L 5.453125 -64.890625 L 29.3125 -64.890625 L 29.3125 -57.5 L 21.390625 -57.5 L 21.390625 -7.390625 L 29.3125 -7.390625 L 29.3125 0 Z" /></g>
              <g fill="#ff8210" transform="translate(672.202949,890.946455)"><path d="M 7.65625 0 L 7.65625 -64.890625 L 18.578125 -64.890625 L 47.546875 -12.671875 L 47.546875 -64.890625 L 55.5625 -64.890625 L 55.5625 0 L 46.046875 0 L 17.609375 -51.25 L 15.671875 -51.25 L 15.671875 0 Z" /></g>
              <g fill="#ff8210" transform="translate(735.417818,890.946455)"><path d="M 20.421875 0 L 20.421875 -57.5 L 1.140625 -57.5 L 1.140625 -64.890625 L 47.71875 -64.890625 L 47.71875 -57.5 L 28.4375 -57.5 L 28.4375 0 Z" /></g>
              <g fill="#ff8210" transform="translate(784.281614,890.946455)"><path d="M 15.234375 0 L 5.984375 -9.25 L 5.984375 -55.640625 L 15.234375 -64.890625 L 45.875 -64.890625 L 55.125 -55.640625 L 55.125 -9.25 L 45.875 0 Z M 18.84375 -7.125 L 42.265625 -7.125 L 47.109375 -11.96875 L 47.109375 -52.921875 L 42.265625 -57.765625 L 18.84375 -57.765625 L 14 -52.921875 L 14 -11.96875 Z" /></g>
              <g fill="#ff8210" transform="translate(864.928991,890.946455)"><path d="M 7.65625 0 L 7.65625 -64.890625 L 42.875 -64.890625 L 56.34375 -51.25 L 56.34375 -13.640625 L 42.875 0 Z M 15.671875 -7.125 L 39.265625 -7.125 L 48.34375 -16.375 L 48.34375 -48.515625 L 39.265625 -57.765625 L 15.671875 -57.765625 Z" /></g>
              <g fill="#ff8210" transform="translate(926.999314,890.946455)"><path d="M 7.65625 0 L 7.65625 -64.890625 L 50.453125 -64.890625 L 50.453125 -57.5 L 15.671875 -57.5 L 15.671875 -37.765625 L 46.75 -37.765625 L 46.75 -30.46875 L 15.671875 -30.46875 L 15.671875 -7.390625 L 50.453125 -7.390625 L 50.453125 0 Z" /></g>
              <g fill="#ff8210" transform="translate(982.026165,890.946455)"><path d="M 15.234375 0 L 5.984375 -9.25 L 5.984375 -55.640625 L 15.234375 -64.890625 L 44.546875 -64.890625 L 53.53125 -55.90625 L 48.421875 -50.71875 L 41.375 -57.765625 L 18.84375 -57.765625 L 14 -52.921875 L 14 -11.96875 L 18.84375 -7.125 L 42.09375 -7.125 L 49.21875 -14.265625 L 54.328125 -9.0625 L 45.171875 0 Z" /></g>
              <g fill="#ff8210" transform="translate(1038.989905,890.946455)"><path d="M 5.453125 0 L 5.453125 -7.390625 L 13.390625 -7.390625 L 13.390625 -57.5 L 5.453125 -57.5 L 5.453125 -64.890625 L 29.3125 -64.890625 L 29.3125 -57.5 L 21.390625 -57.5 L 21.390625 -7.390625 L 29.3125 -7.390625 L 29.3125 0 Z" /></g>
              <g fill="#ff8210" transform="translate(1073.766849,890.946455)"><path d="M 7.75 0 L 7.75 -7.390625 L 39.703125 -7.390625 L 44.46875 -12.234375 L 44.46875 -25.1875 L 39.703125 -30.03125 L 14.609375 -30.03125 L 5.453125 -39.1875 L 5.453125 -55.640625 L 14.609375 -64.890625 L 49.125 -64.890625 L 49.125 -57.5 L 18.21875 -57.5 L 13.390625 -52.65625 L 13.46875 -41.90625 L 18.21875 -37.0625 L 43.3125 -37.0625 L 52.46875 -27.828125 L 52.46875 -9.25 L 43.3125 0 Z" /></g>
              <g fill="#ff8210" transform="translate(1131.699217,890.946455)"><path d="M 5.453125 0 L 5.453125 -7.390625 L 13.390625 -7.390625 L 13.390625 -57.5 L 5.453125 -57.5 L 5.453125 -64.890625 L 29.3125 -64.890625 L 29.3125 -57.5 L 21.390625 -57.5 L 21.390625 -7.390625 L 29.3125 -7.390625 L 29.3125 0 Z" /></g>
              <g fill="#ff8210" transform="translate(1166.476161,890.946455)"><path d="M 15.234375 0 L 5.984375 -9.25 L 5.984375 -55.640625 L 15.234375 -64.890625 L 45.875 -64.890625 L 55.125 -55.640625 L 55.125 -9.25 L 45.875 0 Z M 18.84375 -7.125 L 42.265625 -7.125 L 47.109375 -11.96875 L 47.109375 -52.921875 L 42.265625 -57.765625 L 18.84375 -57.765625 L 14 -52.921875 L 14 -11.96875 Z" /></g>
              <g fill="#ff8210" transform="translate(1227.577993,890.946455)"><path d="M 7.65625 0 L 7.65625 -64.890625 L 18.578125 -64.890625 L 47.546875 -12.671875 L 47.546875 -64.890625 L 55.5625 -64.890625 L 55.5625 0 L 46.046875 0 L 17.609375 -51.25 L 15.671875 -51.25 L 15.671875 0 Z" /></g>
              <g fill="#ff8210" transform="translate(1290.79277,890.946455)"><path d="M 7.75 0 L 7.75 -7.390625 L 39.703125 -7.390625 L 44.46875 -12.234375 L 44.46875 -25.1875 L 39.703125 -30.03125 L 14.609375 -30.03125 L 5.453125 -39.1875 L 5.453125 -55.640625 L 14.609375 -64.890625 L 49.125 -64.890625 L 49.125 -57.5 L 18.21875 -57.5 L 13.390625 -52.65625 L 13.46875 -41.90625 L 18.21875 -37.0625 L 43.3125 -37.0625 L 52.46875 -27.828125 L 52.46875 -9.25 L 43.3125 0 Z" /></g>
            </g>
          </svg>
        </div>

        </>}
      </div>
    </>
  )
}
