import React from 'react';
import { type AppDefinition } from './types';

export const APPS: AppDefinition[] = [
  {
    name: 'PowerPoint',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-full w-full">
        <defs>
          <linearGradient id="ppt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill="#fff7ed" />
        <g transform="translate(20, 20)">
             <rect width="60" height="60" rx="8" fill="url(#ppt-grad)"/>
             <path d="M44 25 V55 M44 25 H55 C62 25 62 40 55 40 H44" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
             <g transform="translate(45, 15)">
                 <circle cx="15" cy="15" r="18" fill="none" stroke="white" strokeWidth="2" opacity="0.3"/>
                 <path d="M15 0 L30 30 H0 Z" fill="white" opacity="0.2" transform="rotate(45 15 15)"/>
             </g>
        </g>
      </svg>
    ),
  },
  {
    name: 'Word',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-full w-full">
          <rect width="100" height="100" rx="22" fill="#eff6ff"/>
          <g transform="translate(15, 15)">
              <rect x="5" y="5" width="60" height="60" rx="8" fill="#2563eb"/>
              <path d="M20 25 L27 55 L35 35 L43 55 L50 25" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <rect x="45" y="15" width="25" height="30" rx="2" fill="#93c5fd" opacity="0.8"/>
              <rect x="48" y="20" width="19" height="3" rx="1.5" fill="white"/>
              <rect x="48" y="26" width="19" height="3" rx="1.5" fill="white"/>
              <rect x="48" y="32" width="14" height="3" rx="1.5" fill="white"/>
          </g>
      </svg>
    )
  },
  {
    name: 'Excel',
    icon: (
       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-full w-full">
          <rect width="100" height="100" rx="22" fill="#f0fdf4"/>
          <g transform="translate(20, 20)">
              <rect x="0" y="0" width="60" height="60" rx="8" fill="#16a34a"/>
              <path d="M18 18 L42 42 M42 18 L18 42" stroke="white" strokeWidth="8" strokeLinecap="round"/>
              <rect x="40" y="35" width="25" height="25" rx="4" fill="#86efac" opacity="0.9"/>
              <rect x="45" y="40" width="6" height="6" fill="#15803d" opacity="0.6"/>
              <rect x="54" y="40" width="6" height="6" fill="#15803d" opacity="0.6"/>
              <rect x="45" y="49" width="6" height="6" fill="#15803d" opacity="0.6"/>
              <rect x="54" y="49" width="6" height="6" fill="#15803d" opacity="0.6"/>
          </g>
      </svg>
    )
  },
  {
    name: 'Browser',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-full w-full">
        <defs>
            <radialGradient id="browser-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f0f9ff" />
                <stop offset="100%" stopColor="#e0f2fe" />
            </radialGradient>
            <linearGradient id="browser-needle" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill="url(#browser-grad)"/>
        <circle cx="50" cy="50" r="30" fill="white" stroke="#38bdf8" strokeWidth="4"/>
        <path d="M50 20 L50 80 M20 50 L80 50" stroke="#bae6fd" strokeWidth="2"/>
        <path d="M 50 50 L 68 32" stroke="url(#browser-needle)" strokeWidth="6" strokeLinecap="round"/>
        <path d="M 50 50 L 32 68" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round"/>
      </svg>
    )
  },
  {
    name: 'Google',
    icon: (
       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-full w-full">
        <rect width="100" height="100" rx="22" fill="#f8fafc"/>
        <g transform="translate(20,20) scale(0.6)">
            <path d="M96.8,51.3c0-3.6-0.3-7.2-0.9-10.6H50v20.1h26.3c-1.1,6.5-4.4,12.2-9.6,15.9v13h16.7 C91.7,83,96.8,68.2,96.8,51.3z" fill="#4285F4"/>
            <path d="M50,99c14,0,25.8-4.6,34.4-12.5L67.7,73.5c-4.6,3.1-10.6,5-17.7,5c-13.6,0-25.1-9.1-29.2-21.4H9.8v13.6 C18.5,88.1,33.1,99,50,99z" fill="#34A853"/>
            <path d="M20.8,57.1c-0.6-1.8-1-3.6-1-5.6s0.4-3.8,1-5.6V32.4H9.8C6.3,39.1,4,44.9,4,51.5s2.3,12.4,6,19.1L20.8,57.1z" fill="#FBBC05"/>
            <path d="M50,19.5c7.6,0,14.5,2.6,20,7l14.1-14.1C75.8,4.6,64,0,50,0C33.1,0,18.5,10.9,9.8,26.5l17.7,13.6 C31.9,28.6,40.4,19.5,50,19.5z" fill="#EA4335"/>
        </g>
      </svg>
    )
  },
  {
    name: 'Nani',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-full w-full">
        <defs>
          <linearGradient id="nani-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill="url(#nani-grad)" />
        <g transform="translate(25, 25) scale(0.5)">
          <path d="M20 30 L20 70 L30 70 L30 50 L70 70 L70 30 L60 30 L60 50 L20 30 Z" fill="white"/>
        </g>
      </svg>
    )
  },
  {
    name: 'Settings',
    icon: (
       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="h-full w-full">
        <rect width="64" height="64" rx="14" fill="#f3f4f6" />
        <path fill="#B0B5BA" d="M52,35.4c-0.1-1-0.2-2-0.4-3l4.1-3.2c0.4-0.3,0.5-0.8,0.2-1.2l-3.8-6.6c-0.2-0.4-0.7-0.6-1.2-0.4 l-4.8,1.9c-1-0.8-2.1-1.4-3.2-1.9l-0.7-5c-0.1-0.5-0.5-0.8-1-0.8h-7.7c-0.5,0-0.9,0.3-1,0.8l-0.7,5c-1.2,0.5-2.2,1.1-3.2,1.9 l-4.8-1.9c-0.5-0.2-1,0-1.2,0.4l3.8-6.6c0.2-0.4,0.1-0.9-0.2-1.2l-4.1-3.2C51.8,39.4,51.9,38.4,52,37.4C52.1,36.4,52.1,35.4,52,35.4z"/>
        <path fill="#D1D5DB" d="M47.7,35.1c0-0.6,0-1.3-0.1-1.9l3.5-2.7c0.3-0.2,0.4-0.6,0.2-0.9l-3.3-5.7c-0.2-0.3-0.6-0.5-0.9-0.3 l-4.1,1.6c-0.9-0.6-1.8-1.2-2.8-1.6l-0.6-4.3c-0.1-0.4-0.4-0.7-0.8-0.7h-6.6c-0.4,0-0.8,0.3-0.8,0.7l-0.6,4.3 c-1,0.4-1.9,1-2.8,1.6l-4.1-1.6c-0.4-0.2-0.8,0-0.9,0.3 l-3.3-5.7c0.2-0.3,0.1-0.7-0.2-0.9l-3.5-2.7C47.6,36.4,47.7,35.7,47.7,35.1z"/>
        <circle fill="#F3F4F6" cx="32" cy="32.8" r="9"/>
        <circle fill="#B0B5BA" cx="32" cy="32.8" r="5"/>
      </svg>
    ),
  },
    {
    name: 'Shortcuts',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-full w-full">
        <rect width="100" height="100" rx="22" fill="#f7f7f7"/>
        <g transform="translate(15, 20)">
            <rect x="0" y="0" width="70" height="50" rx="8" fill="#e0e0e0"/>
            <rect x="5" y="5" width="60" height="40" rx="5" fill="#f0f0f0"/>
            <rect x="10" y="30" width="50" height="10" rx="3" fill="#cccccc"/>
            <rect x="10" y="10" width="10" height="10" rx="3" fill="#cccccc"/>
            <rect x="23" y="10" width="10" height="10" rx="3" fill="#cccccc"/>
            <rect x="36" y="10" width="10" height="10" rx="3" fill="#cccccc"/>
            <rect x="49" y="10" width="10" height="10" rx="3" fill="#cccccc"/>
            <g fill="#333333" transform="translate(40, 38) scale(1.5)">
              <path d="M 0 -2 L 2 -2 L 1 0 Z" />
              <path d="M 0 2 L 2 2 L 1 0 Z" transform="rotate(180, 1, 1)" />
            </g>
        </g>
      </svg>
    ),
  },
  {
    name: 'Veo Video',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-full w-full">
        <defs>
          <linearGradient id="veo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2c2c2c" />
            <stop offset="100%" stopColor="#1a1a1a" />
          </linearGradient>
          <radialGradient id="veo-play-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#7c3aed" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill="url(#veo-grad)" />
        <circle cx="50" cy="50" r="28" fill="url(#veo-play-grad)"/>
        <path d="M44 38 L 62 50 L 44 62 Z" fill="white"/>
      </svg>
    )
  },
  {
    name: 'Image Studio',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-full w-full">
        <rect width="100" height="100" rx="22" fill="#f8fafc"/>
        <g transform="translate(50,50)">
          <path d="M0 -38 A 20 20 0 0 1 22 -32 L 0 0 Z" fill="#ef4444" opacity="0.8" transform="rotate(0)"/>
          <path d="M0 -38 A 20 20 0 0 1 22 -32 L 0 0 Z" fill="#f97316" opacity="0.8" transform="rotate(45)"/>
          <path d="M0 -38 A 20 20 0 0 1 22 -32 L 0 0 Z" fill="#eab308" opacity="0.8" transform="rotate(90)"/>
          <path d="M0 -38 A 20 20 0 0 1 22 -32 L 0 0 Z" fill="#84cc16" opacity="0.8" transform="rotate(135)"/>
          <path d="M0 -38 A 20 20 0 0 1 22 -32 L 0 0 Z" fill="#22c55e" opacity="0.8" transform="rotate(180)"/>
          <path d="M0 -38 A 20 20 0 0 1 22 -32 L 0 0 Z" fill="#14b8a6" opacity="0.8" transform="rotate(225)"/>
          <path d="M0 -38 A 20 20 0 0 1 22 -32 L 0 0 Z" fill="#3b82f6" opacity="0.8" transform="rotate(270)"/>
          <path d="M0 -38 A 20 20 0 0 1 22 -32 L 0 0 Z" fill="#8b5cf6" opacity="0.8" transform="rotate(315)"/>
        </g>
      </svg>
    )
  },
  {
    name: 'Cherry AI',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-full w-full">
        <defs>
          <radialGradient id="cherry-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef2f2" />
            <stop offset="100%" stopColor="#fee2e2" />
          </radialGradient>
          <radialGradient id="cherry1-grad" cx="25%" cy="25%" r="65%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="100%" stopColor="#ef4444" />
          </radialGradient>
          <radialGradient id="cherry2-grad" cx="25%" cy="25%" r="65%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#dc2626" />
          </radialGradient>
          <linearGradient id="cherry-stem" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4d7c0f" />
            <stop offset="100%" stopColor="#365314" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill="url(#cherry-bg)"/>
        <g transform="translate(10 10) scale(1.1)">
          <circle cx="58" cy="45" r="22" fill="url(#cherry2-grad)" />
          <circle cx="42" cy="65" r="22" fill="url(#cherry1-grad)" />
          <path d="M60,30 C 75,10 85,15 80,20" stroke="url(#cherry-stem)" strokeWidth="6" fill="none" strokeLinecap="round" />
        </g>
      </svg>
    )
  },
  {
    name: 'File Manager',
    icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-full w-full">
            <rect width="100" height="100" rx="22" fill="#e0f2fe" />
            <path d="M 20 30 H 80 V 75 C 80 80.523 75.523 85 70 85 H 30 C 24.477 85 20 80.523 20 75 V 30 Z" fill="#60a5fa" />
            <path d="M 15 35 H 85 V 40 H 15 Z" fill="#3b82f6" />
            <path d="M 20 20 H 50 L 55 30 H 20 Z" fill="#93c5fd" />
        </svg>
    )
  },
  {
    name: 'PortfolioMaker',
    icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-full w-full">
            <defs>
                <linearGradient id="portfolio-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" rx="22" fill="#f0f9ff" />
            <rect x="20" y="30" width="60" height="45" rx="5" fill="url(#portfolio-grad)" />
            <path d="M 30 20 L 30 80" stroke="#0ea5e9" strokeWidth="4" fill="none" />
            <circle cx="50" cy="52.5" r="8" fill="white"/>
            <rect x="40" y="65" width="20" height="4" rx="2" fill="white" opacity="0.8"/>
        </svg>
    )
  }
];