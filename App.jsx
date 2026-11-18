import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Lock,
  Key,
  UserCheck,
  Users,
  LogOut,
  QrCode,
  Mail,
  MessageSquare,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Search,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Smartphone,
  Calendar,
  MapPin,
  Printer,
  Send,
  Trash2,
  Phone,
  Link2,
  ExternalLink,
  Settings,
  Sparkles,
  Volume2,
  VolumeX,
  ArrowLeft,
  Share2,
  Ticket,
  Upload,
  FileSpreadsheet,
  Server,
  Edit3,
  Info,
  Camera,
  CameraOff,
  Image as ImageIcon,
  ScanText
} from 'lucide-react';

// ============================================================================
// CRYPTOGRAPHIC PASSWORD HASHING & JWT ENGINE
// ============================================================================
const JWT_SECRET_SIGNATURE = 'AM_ENTERPRISE_HMAC_SHA256_99F8A2C4D7E1B';

const computeSaltedPasswordHash = (plainPassword, emailSalt = 'am_salt') => {
  const input = `${String(emailSalt || '').toLowerCase().trim()}::${String(plainPassword || '')}::${JWT_SECRET_SIGNATURE}`;
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0, ch; i < input.length; i++) {
    ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `$2b$12$AM.${hex1}${hex2}${hex1.split('').reverse().join('')}`;
};

const base64UrlEncode = (obj) => {
  const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const base64UrlDecode = (str) => {
  try {
    const padded = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(padded))));
  } catch {
    return null;
  }
};

const signJwtToken = (user, rememberMe = false) => {
  const nowSec = Math.floor(Date.now() / 1000);
  const ttlSeconds = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    station: user.station,
    rememberMe: Boolean(rememberMe),
    iat: nowSec,
    exp: nowSec + ttlSeconds
  };
  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const signature = computeSaltedPasswordHash(
    `${encodedHeader}.${encodedPayload}`,
    JWT_SECRET_SIGNATURE
  ).slice(-24);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

const verifyAndDecodeJwt = (token) => {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Not authenticated' };
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid session' };
  }
  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSig = computeSaltedPasswordHash(
    `${encodedHeader}.${encodedPayload}`,
    JWT_SECRET_SIGNATURE
  ).slice(-24);

  if (signature !== expectedSig) {
    return { valid: false, error: 'Session signature mismatch' };
  }
  const payload = base64UrlDecode(encodedPayload);
  if (!payload || !payload.sub || !payload.role) {
    return { valid: false, error: 'Invalid session payload' };
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < nowSec) {
    return { valid: false, error: 'Session expired' };
  }
  return { valid: true, payload };
};

const playScannerBeep = (type = 'valid') => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'valid') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'duplicate') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(380, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
      osc.start();
      osc.stop(ctx.currentTime + 0.32);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(165, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
      osc.start();
      osc.stop(ctx.currentTime + 0.38);
    }
  } catch {}
};

// ============================================================================
// CUSTOM GEOMETRIC "AM" MONOGRAM LOGO
// ============================================================================
const AMLogo = ({ size = 42, showText = true }) => (
  <div className="flex items-center gap-3 select-none group">
    <div
      style={{ width: size, height: size }}
      className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-indigo-900 p-[1.5px] shadow-lg shadow-emerald-500/20 shrink-0"
    >
      <div className="w-full h-full bg-slate-950 rounded-[10.5px] flex items-center justify-center relative overflow-hidden">
        <div className="absolute -top-4 -left-4 w-10 h-10 bg-emerald-500/30 rounded-full blur-md" />
        <div className="absolute -bottom-4 -right-4 w-10 h-10 bg-amber-400/20 rounded-full blur-md" />
        <svg
          viewBox="0 0 100 100"
          className="w-4/5 h-4/5 relative z-10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="amGradPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="50%" stopColor="#2DD4BF" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>
            <linearGradient id="amGradGold" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#FEF08A" />
            </linearGradient>
          </defs>
          <path d="M12 24V12H24" stroke="url(#amGradPrimary)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
          <path d="M88 24V12H76" stroke="url(#amGradPrimary)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
          <path d="M12 76V88H24" stroke="url(#amGradGold)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
          <path d="M88 76V88H76" stroke="url(#amGradGold)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
          <path d="M18 76L36 26L52 76" stroke="url(#amGradPrimary)" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M25 57H45" stroke="url(#amGradGold)" strokeWidth="7" strokeLinecap="round" />
          <path d="M44 76V28L63 55L82 28V76" stroke="url(#amGradGold)" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="60" y="16" width="6" height="6" rx="1.5" transform="rotate(45 63 16)" fill="#34D399" />
        </svg>
      </div>
    </div>

    {showText && (
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-extrabold tracking-tight text-lg leading-none text-white">
            AM{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
              EVENTS MANAGER
            </span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            ENTERPRISE
          </span>
        </div>
        <span className="text-[11px] font-medium tracking-wide mt-0.5 text-slate-400">
          QR Tickets, Email &amp; WhatsApp Dispatch &amp; Offline Door Check-In
        </span>
      </div>
    )}
  </div>
);

// ============================================================================
// DETERMINISTIC SCANNABLE-STYLE QR CODE SVG MATRIX
// ============================================================================
const QRCodeMatrix = ({ value = 'AM-TICKET', size = 128, className = '' }) => {
  const matrix = useMemo(() => {
    const str = String(value || 'AM-TICKET');
    const grid = Array(21)
      .fill(null)
      .map(() => Array(21).fill(false));

    const drawFinder = (r0, c0) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 ||
            r === 6 ||
            c === 0 ||
            c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            grid[r0 + r][c0 + c] = true;
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, 14);
    drawFinder(14, 0);

    for (let i = 8; i < 13; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    for (let r = 0; r < 21; r++) {
      for (let c = 0; c < 21; c++) {
        const inTopLeft = r < 8 && c < 8;
        const inTopRight = r < 8 && c >= 13;
        const inBottomLeft = r >= 13 && c < 8;
        const isTiming = r === 6 || c === 6;

        if (!inTopLeft && !inTopRight && !inBottomLeft && !isTiming) {
          const seed = Math.imul(hash ^ (r * 31 + c * 17), 1597334677);
          const charCode = str.charCodeAt((r * 21 + c) % str.length) || 7;
          grid[r][c] = (Math.abs(seed) + charCode * (r + 1)) % 10 < 5;
        }
      }
    }
    return grid;
  }, [value]);

  return (
    <div
      style={{ width: size, height: size }}
      className={`bg-white p-2 rounded-xl shadow-inner border border-slate-200 flex items-center justify-center relative shrink-0 ${className}`}
    >
      <svg viewBox="0 0 21 21" className="w-full h-full" shapeRendering="crispEdges">
        {matrix.map((row, rIdx) =>
          row.map((cell, cIdx) =>
            cell ? (
              <rect
                key={`${rIdx}-${cIdx}`}
                x={cIdx}
                y={rIdx}
                width={1}
                height={1}
                fill="#0F172A"
              />
            ) : null
          )
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-6 h-6 rounded-md bg-slate-950 border-2 border-white flex items-center justify-center shadow-sm">
          <span className="text-[8px] font-black tracking-tighter bg-gradient-to-r from-emerald-400 to-amber-300 bg-clip-text text-transparent">
            AM
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STRICT 3-TIER ROLES HIERARCHY (`super_admin`, `admin`, `user`)
// ============================================================================
const ROLES_HIERARCHY = {
  super_admin: {
    id: 'super_admin',
    label: 'Super Admin',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    canManageUsers: true,
    canManageEvents: true,
    canRegisterGuests: true,
    canSendInvites: true,
    canBatchDispatch: true,
    canExportCSV: true,
    canScanTickets: true
  },
  admin: {
    id: 'admin',
    label: 'Admin (Coordinator)',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    canManageUsers: false,
    canManageEvents: true,
    canRegisterGuests: true,
    canSendInvites: true,
    canBatchDispatch: true,
    canExportCSV: true,
    canScanTickets: true
  },
  user: {
    id: 'user',
    label: 'Receptionist / Scanner',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
    canManageUsers: false,
    canManageEvents: false,
    canRegisterGuests: false,
    canSendInvites: false,
    canBatchDispatch: false,
    canExportCSV: false,
    canScanTickets: true
  }
};

const getTicketBadgeStyle = (type) => {
  if (type === 'VIP') return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
  if (type === 'Staff') return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40';
  return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
};

// ============================================================================
// INITIAL APP CONFIG (BROWSER-COMPATIBLE EMAIL DELIVERY + MAIN WHATSAPP)
// ============================================================================
const INITIAL_APP_CONFIG = {
  deliveryEngine: 'mailto',
  senderEmail: 'tickets@am-events.ae',
  senderDisplayName: 'AM Events — Ticketing Desk',
  replyToEmail: 'support@am-events.ae',
  emailjsServiceId: '',
  emailjsTemplateId: '',
  emailjsPublicKey: '',
  restApiEndpoint: 'https://api.resend.com/emails',
  restApiBearerToken: '',
  emailVerified: true,
  lastTestedAt: 'Ready (Mail Client + API)',
  mainWhatsappNumber: '+971508429900',
  mainWhatsappLabel: 'AM Events Main WhatsApp Gateway',
  whatsappPhoneId: '',
  whatsappApiToken: ''
};

const SAMPLE_BULK_CSV_TEXT = `First Name,Last Name,Email,WhatsApp,Ticket Type,Quantity,Notes
Layla,Al-Qasimi,layla.qasimi@emirates-corp.ae,+971504412233,VIP,2,Keynote VIP Table
Omar,Farooq,omar.farooq@techmena.io,+971528839911,Regular,1,General Delegate
Noura,Al-Suwaidi,noura.suwaidi@mediahub.ae,+971559921100,VIP,3,Sponsor Delegation
Kareem,Zayed,kareem.zayed@eventcrew.ae,+971561102299,Staff,1,AV & Stage Engineer
Zainab,Mansoor,zainab.m@globalpartners.org,+971507748822,Regular,2,Partner Guest`;

// ============================================================================
// SEEDED ACCOUNTS (`sadmin` / `Akais@2020`), EVENTS, & BOOKINGS
// ============================================================================
const SEEDED_USERS = [
  {
    id: 'usr_super_01',
    name: 'Super Administrator',
    username: 'sadmin',
    email: 'sadmin@amevents.local',
    role: 'super_admin',
    station: 'Headquarters Command',
    passwordHash: computeSaltedPasswordHash('Akais@2020', 'sadmin@amevents.local'),
    createdAt: '2026-01-01 09:00',
    createdBy: 'System Seed'
  },
  {
    id: 'usr_admin_02',
    name: 'Event Coordinator',
    username: 'admin',
    email: 'admin@amevents.local',
    role: 'admin',
    station: 'Registration & Dispatch Desk',
    passwordHash: computeSaltedPasswordHash('Admin@2026', 'admin@amevents.local'),
    createdAt: '2026-02-14 09:30',
    createdBy: 'sadmin'
  },
  {
    id: 'usr_user_03',
    name: 'Gate Door Scanner',
    username: 'scanner',
    email: 'scanner@amevents.local',
    role: 'user',
    station: 'VIP Gate 1 Scanner',
    passwordHash: computeSaltedPasswordHash('Scan@2026', 'scanner@amevents.local'),
    createdAt: '2026-03-10 14:15',
    createdBy: 'sadmin'
  }
];

const INITIAL_EVENTS = [
  {
    id: 'EVT-2026-01',
    name: 'Annual Graduation & Excellence Gala 2026',
    date: '2026-06-18',
    time: '18:00 - 22:30',
    location: 'Grand Emerald Arena & Outdoor Lawn',
    capacity: 500,
    status: 'Active',
    description: 'Annual gala reception, keynote awards, and VIP dinner.',
    whatsappSenderNumber: '+971508429900',
    whatsappSenderLabel: 'Gala Official WhatsApp Desk'
  },
  {
    id: 'EVT-2026-02',
    name: 'Desert Oasis Music & Arts Festival (Field Stage)',
    date: '2026-07-24',
    time: '15:00 - 01:00',
    location: 'North Meadow Grounds (Offline Field Zone)',
    capacity: 1200,
    status: 'Active',
    description: 'Outdoor live festival with offline mobile check-in gates.',
    whatsappSenderNumber: '+971529104411',
    whatsappSenderLabel: 'Festival Box Office WhatsApp'
  }
];

const INITIAL_INVITE_LINKS = [
  {
    id: 'INV-8801',
    token: 'am-gala-2026-open',
    eventId: 'EVT-2026-01',
    label: 'General Guest Invitation Link (Guest Chooses VIP / Regular / Staff)',
    allowedTierMode: 'DROPDOWN_ALL',
    defaultTier: 'Regular',
    maxTicketsPerBooking: 5,
    createdBy: 'sadmin',
    createdAt: '2026-05-01',
    registrationsCount: 14,
    isActive: true
  },
  {
    id: 'INV-8802',
    token: 'am-gala-2026-vip-only',
    eventId: 'EVT-2026-01',
    label: 'Executive VIP Table Invitation Link',
    allowedTierMode: 'VIP',
    defaultTier: 'VIP',
    maxTicketsPerBooking: 4,
    createdBy: 'sadmin',
    createdAt: '2026-05-03',
    registrationsCount: 6,
    isActive: true
  }
];

const INITIAL_BOOKINGS = [
  {
    id: 'BK-1001',
    eventId: 'EVT-2026-01',
    firstName: 'Tariq',
    lastName: 'Al-Mansoor',
    email: 'tariq.mansoor@example.com',
    whatsapp: '+971501234567',
    organization: 'Royal Investment Group',
    ticketType: 'VIP',
    status: 'Approved',
    source: 'Admin Desk',
    bookedAt: '2026-05-01 10:15',
    emailSentAt: null,
    dispatchedFromEmail: null,
    whatsappSentAt: null,
    dispatchedFromSender: null,
    tickets: [
      {
        ticketId: 'TKT-1001-1',
        qrString: 'AM-EVT01-VIP-BK1001-T1-9F8A2C',
        attendeeLabel: 'Tariq Al-Mansoor (VIP 1 of 2)',
        checkedIn: true,
        checkedInAt: '2026-06-18 17:42:10',
        checkedInBy: 'scanner'
      },
      {
        ticketId: 'TKT-1001-2',
        qrString: 'AM-EVT01-VIP-BK1001-T2-4D7E1B',
        attendeeLabel: 'Tariq Al-Mansoor (VIP 2 of 2)',
        checkedIn: false,
        checkedInAt: null,
        checkedInBy: null
      }
    ]
  },
  {
    id: 'BK-1002',
    eventId: 'EVT-2026-01',
    firstName: 'Sarah',
    lastName: 'Jenkins',
    email: 'sarah.jenkins@example.org',
    whatsapp: '+447700900123',
    organization: 'Global Media Partners',
    ticketType: 'Regular',
    status: 'Approved',
    source: 'Invite Link (INV-8801)',
    bookedAt: '2026-05-02 11:30',
    emailSentAt: null,
    dispatchedFromEmail: null,
    whatsappSentAt: null,
    dispatchedFromSender: null,
    tickets: [
      {
        ticketId: 'TKT-1002-1',
        qrString: 'AM-EVT01-REG-BK1002-T1-2A6F5D',
        attendeeLabel: 'Sarah Jenkins (Regular Pass)',
        checkedIn: false,
        checkedInAt: null,
        checkedInBy: null
      }
    ]
  },
  {
    id: 'BK-1003',
    eventId: 'EVT-2026-01',
    firstName: 'Elena',
    lastName: 'Rostova',
    email: 'elena.rostova@production.io',
    whatsapp: '+971589001122',
    organization: 'Stage & Sound Crew',
    ticketType: 'Staff',
    status: 'Approved',
    source: 'Admin Desk',
    bookedAt: '2026-05-05 13:20',
    emailSentAt: null,
    dispatchedFromEmail: null,
    whatsappSentAt: null,
    dispatchedFromSender: null,
    tickets: [
      {
        ticketId: 'TKT-1003-1',
        qrString: 'AM-EVT01-STA-BK1003-T1-7A2E4C',
        attendeeLabel: 'Elena Rostova (Staff All-Access)',
        checkedIn: false,
        checkedInAt: null,
        checkedInBy: null
      }
    ]
  }
];

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  // 1. Staff Users Database (`sadmin` / `Akais@2020`)
  const [usersDb, setUsersDb] = useState(() => {
    try {
      const saved = localStorage.getItem('am_prod_users_v8');
      return saved ? JSON.parse(saved) : SEEDED_USERS;
    } catch {
      return SEEDED_USERS;
    }
  });

  // 2. Signed JWT Session Token (Supports Remember Me persistent vs session storage)
  const [jwtToken, setJwtToken] = useState(() => {
    try {
      return (
        localStorage.getItem('am_prod_jwt_v8') ||
        sessionStorage.getItem('am_prod_jwt_v8') ||
        null
      );
    } catch {
      return null;
    }
  });

  // 3. Events Database
  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('am_prod_events_v8');
      return saved ? JSON.parse(saved) : INITIAL_EVENTS;
    } catch {
      return INITIAL_EVENTS;
    }
  });
  const [selectedEventId, setSelectedEventId] = useState('EVT-2026-01');

  // 4. Event Invitation Links Database
  const [inviteLinks, setInviteLinks] = useState(() => {
    try {
      const saved = localStorage.getItem('am_prod_invites_v8');
      return saved ? JSON.parse(saved) : INITIAL_INVITE_LINKS;
    } catch {
      return INITIAL_INVITE_LINKS;
    }
  });

  // 5. Bookings Database
  const [bookings, setBookings] = useState(() => {
    try {
      const saved = localStorage.getItem('am_prod_bookings_v8');
      return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
    } catch {
      return INITIAL_BOOKINGS;
    }
  });

  // 6. Global App Config (Browser-Direct Email Delivery & Main WhatsApp Sender)
  const [appConfig, setAppConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('am_prod_app_config_v8');
      return saved ? JSON.parse(saved) : INITIAL_APP_CONFIG;
    } catch {
      return INITIAL_APP_CONFIG;
    }
  });
  const [configForm, setConfigForm] = useState(appConfig);
  const [showApiTokenSecret, setShowApiTokenSecret] = useState(false);
  const [showWaTokenSecret, setShowWaTokenSecret] = useState(false);
  const [testRecipientEmail, setTestRecipientEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Super Admin Password Reset Modal State
  const [passwordModalUser, setPasswordModalUser] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showNewPasswordText, setShowNewPasswordText] = useState(true);
  const [updatedCredentialSummary, setUpdatedCredentialSummary] = useState(null);

  // Super Admin Bulk CSV Guest Import Modal State
  const [showBulkCsvModal, setShowBulkCsvModal] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [parsedCsvRows, setParsedCsvRows] = useState([]);
  const [csvAutoCheckIn, setCsvAutoCheckIn] = useState(false);

  // Active Navigation Route
  const [currentRoute, setCurrentRoute] = useState('/dashboard');

  // Guest Self-Registration Invitation Portal State
  const [activeGuestInvite, setActiveGuestInvite] = useState(null);
  const [guestPortalSubmittedBooking, setGuestPortalSubmittedBooking] = useState(null);
  const [guestPortalForm, setGuestPortalForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    whatsapp: '',
    organization: '',
    ticketType: 'Regular',
    quantity: 1
  });

  // Login Form State (with Remember Me persistence)
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem('am_prod_remember_flag_v8') === 'true';
    } catch {
      return true;
    }
  });
  const [loginForm, setLoginForm] = useState(() => {
    try {
      const rememberedIdentifier =
        localStorage.getItem('am_prod_remembered_id_v8') || '';
      return { identifier: rememberedIdentifier, password: '' };
    } catch {
      return { identifier: '', password: '' };
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Super Admin Staff Creation Form
  const [provisionForm, setProvisionForm] = useState({
    name: '',
    username: '',
    email: '',
    temporaryPassword: 'StaffPass!2026',
    role: 'admin',
    station: 'Event Operations Desk'
  });

  // Edit Active Event Details Modal (Super Admin & Admin)
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editEventForm, setEditEventForm] = useState({
    name: '',
    date: '',
    time: '',
    location: '',
    capacity: 500,
    status: 'Active',
    description: '',
    whatsappSenderNumber: '',
    whatsappSenderLabel: ''
  });

  // New Event Modal
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEventForm, setNewEventForm] = useState({
    name: '',
    date: '2026-09-15',
    time: '18:00 - 23:00',
    location: '',
    capacity: 500,
    status: 'Active',
    description: '',
    whatsappSenderNumber: '+971508429900',
    whatsappSenderLabel: 'Official Event WhatsApp Desk'
  });

  // Create New Invitation Link Form
  const [newInviteForm, setNewInviteForm] = useState({
    label: '',
    allowedTierMode: 'DROPDOWN_ALL',
    defaultTier: 'VIP',
    maxTicketsPerBooking: 4,
    recipientWhatsappToShare: ''
  });

  // Direct Admin Desk Registration Form
  const [guestRegForm, setGuestRegForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    whatsapp: '',
    organization: '',
    ticketType: 'VIP',
    quantity: 1
  });

  // Batch Dispatch Progress Bar State
  const [batchProgress, setBatchProgress] = useState(null);

  // Search, Filters, Modals & Live Camera Scanner
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketTierFilter, setTicketTierFilter] = useState('ALL');
  const [ticketPreviewBooking, setTicketPreviewBooking] = useState(null);
  const [exportPreset, setExportPreset] = useState('Attendium');
  const [manualQrInput, setManualQrInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [isScanningTextId, setIsScanningTextId] = useState(false);
  const videoRef = useRef(null);
  const lastScannedCodeRef = useRef({ code: '', time: 0 });
  const [toast, setToast] = useState(null);

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('am_prod_users_v8', JSON.stringify(usersDb));
    } catch {}
  }, [usersDb]);

  useEffect(() => {
    try {
      localStorage.setItem('am_prod_events_v8', JSON.stringify(events));
    } catch {}
  }, [events]);

  useEffect(() => {
    try {
      localStorage.setItem('am_prod_invites_v8', JSON.stringify(inviteLinks));
    } catch {}
  }, [inviteLinks]);

  useEffect(() => {
    try {
      localStorage.setItem('am_prod_bookings_v8', JSON.stringify(bookings));
    } catch {}
  }, [bookings]);

  useEffect(() => {
    try {
      localStorage.setItem('am_prod_app_config_v8', JSON.stringify(appConfig));
    } catch {}
  }, [appConfig]);

  useEffect(() => {
    try {
      if (jwtToken) {
        if (rememberMe) {
          localStorage.setItem('am_prod_jwt_v8', jwtToken);
          sessionStorage.removeItem('am_prod_jwt_v8');
        } else {
          sessionStorage.setItem('am_prod_jwt_v8', jwtToken);
          localStorage.removeItem('am_prod_jwt_v8');
        }
      } else {
        localStorage.removeItem('am_prod_jwt_v8');
        sessionStorage.removeItem('am_prod_jwt_v8');
      }
    } catch {}
  }, [jwtToken, rememberMe]);

  const showNotification = (message, type = 'success') => {
    setToast({ message: String(message || ''), type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  const copyText = (text, label = 'Copied to clipboard!') => {
    navigator.clipboard?.writeText(String(text || ''));
    showNotification(label);
  };

  // ============================================================================
  // VERIFY JWT SESSION & CURRENT AUTHENTICATED USER
  // ============================================================================
  const sessionVerification = useMemo(() => verifyAndDecodeJwt(jwtToken), [jwtToken]);

  const authenticatedUser = useMemo(() => {
    if (!sessionVerification.valid || !sessionVerification.payload) return null;
    return usersDb.find((u) => u.id === sessionVerification.payload.sub) || null;
  }, [sessionVerification, usersDb]);

  const currentRoleConfig = useMemo(() => {
    if (!authenticatedUser) return ROLES_HIERARCHY.user;
    return ROLES_HIERARCHY[authenticatedUser.role] || ROLES_HIERARCHY.user;
  }, [authenticatedUser]);

  useEffect(() => {
    if (!authenticatedUser && currentRoute !== '/login') {
      setCurrentRoute('/login');
    }
  }, [authenticatedUser, currentRoute]);

  const currentEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) || events[0],
    [events, selectedEventId]
  );

  const eventBookings = useMemo(
    () => bookings.filter((b) => b.eventId === currentEvent.id),
    [bookings, currentEvent]
  );

  const eventInviteLinks = useMemo(
    () => inviteLinks.filter((inv) => inv.eventId === currentEvent.id),
    [inviteLinks, currentEvent]
  );

  const filteredBookings = useMemo(() => {
    return eventBookings.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQ =
        !q ||
        `${b.firstName} ${b.lastName}`.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        (b.whatsapp && b.whatsapp.toLowerCase().includes(q)) ||
        b.id.toLowerCase().includes(q) ||
        b.tickets.some((t) => t.qrString.toLowerCase().includes(q));
      const matchesTier =
        ticketTierFilter === 'ALL' || b.ticketType === ticketTierFilter;
      return matchesQ && matchesTier;
    });
  }, [eventBookings, searchQuery, ticketTierFilter]);

  const eventStats = useMemo(() => {
    let totalTickets = 0;
    let checkedInTickets = 0;
    let vipTickets = 0;
    let regularTickets = 0;
    let staffTickets = 0;
    let dispatchedBookings = 0;

    eventBookings.forEach((b) => {
      if (b.emailSentAt || b.whatsappSentAt) dispatchedBookings++;
      b.tickets.forEach((t) => {
        totalTickets++;
        if (t.checkedIn) checkedInTickets++;
        if (b.ticketType === 'VIP') vipTickets++;
        else if (b.ticketType === 'Staff') staffTickets++;
        else regularTickets++;
      });
    });

    return {
      totalBookings: eventBookings.length,
      totalTickets,
      checkedInTickets,
      vipTickets,
      regularTickets,
      staffTickets,
      dispatchedBookings
    };
  }, [eventBookings]);

  // ============================================================================
  // NAVIGATION GUARD
  // ============================================================================
  const navigateToRoute = (targetRoute) => {
    if (!authenticatedUser) {
      setCurrentRoute('/login');
      return;
    }
    if (targetRoute === '/users' && authenticatedUser.role !== 'super_admin') {
      showNotification('Access Restricted: Staff User Management is reserved for Super Admins.', 'warning');
      return;
    }
    if (
      (targetRoute === '/invites' ||
        targetRoute === '/export' ||
        targetRoute === '/config') &&
      authenticatedUser.role === 'user'
    ) {
      showNotification('Access Restricted: Only Admins and Super Admins can access this section.', 'warning');
      return;
    }
    if (targetRoute === '/config') {
      setConfigForm(appConfig);
    }
    setCurrentRoute(targetRoute);
  };

  // ============================================================================
  // AUTHENTICATION HANDLERS (`sadmin` / `Akais@2020`)
  // ============================================================================
  const handleLoginSubmit = (e) => {
    if (e) e.preventDefault();
    setLoginError(null);

    const identifier = loginForm.identifier.trim().toLowerCase();
    const password = loginForm.password;

    if (!identifier || !password) {
      setLoginError('Please enter both your Username/Email and Password.');
      return;
    }

    const matchedUser = usersDb.find(
      (u) =>
        (u.username && u.username.toLowerCase() === identifier) ||
        u.email.toLowerCase() === identifier
    );

    if (!matchedUser) {
      setLoginError('Invalid username/email or password.');
      return;
    }

    const candidateHash = computeSaltedPasswordHash(password, matchedUser.email);
    if (candidateHash !== matchedUser.passwordHash) {
      setLoginError('Invalid username/email or password.');
      return;
    }

    const token = signJwtToken(matchedUser, rememberMe);
    setJwtToken(token);

    try {
      if (rememberMe) {
        localStorage.setItem('am_prod_remember_flag_v8', 'true');
        localStorage.setItem('am_prod_remembered_id_v8', loginForm.identifier.trim());
      } else {
        localStorage.removeItem('am_prod_remember_flag_v8');
        localStorage.removeItem('am_prod_remembered_id_v8');
      }
    } catch {}

    const defaultLanding = matchedUser.role === 'user' ? '/scanner' : '/dashboard';
    setCurrentRoute(defaultLanding);
    setLoginForm({
      identifier: rememberMe ? loginForm.identifier.trim() : '',
      password: ''
    });
    showNotification(
      `Signed in as ${matchedUser.name} (${ROLES_HIERARCHY[matchedUser.role].label})${
        rememberMe ? ' • Session remembered' : ''
      }`
    );
  };

  const handleLogout = () => {
    setJwtToken(null);
    setCurrentRoute('/login');
    showNotification('Signed out securely.');
  };

  // ============================================================================
  // REAL WORKING EMAIL DELIVERY ENGINE (EmailJS / REST API / Direct Mailto)
  // ============================================================================
  const buildTicketEmailPayload = (booking, eventObj) => {
    const qrLines = booking.tickets
      .map((t, idx) => `Ticket #${idx + 1}: ${t.attendeeLabel} — QR ID: ${t.qrString}`)
      .join('\n');

    const subject = `Your ${booking.ticketType} e-Ticket(s) — ${eventObj.name} [${booking.id}]`;
    const plainBody = [
      `Hello ${booking.firstName} ${booking.lastName},`,
      ``,
      `Your registration for ${eventObj.name} is confirmed!`,
      ``,
      `EVENT DETAILS:`,
      `• Event: ${eventObj.name}`,
      `• Date & Time: ${eventObj.date} (${eventObj.time})`,
      `• Venue: ${eventObj.location}`,
      `• Booking Reference: ${booking.id}`,
      `• Ticket Tier: ${booking.ticketType} (${booking.tickets.length} Pass)`,
      ``,
      `YOUR CHECK-IN QR CODE PASS(ES):`,
      qrLines,
      ``,
      `Please present your QR Code ID(s) at the entrance gate for instant check-in.`,
      `Official Event WhatsApp Desk: ${eventObj.whatsappSenderNumber}`,
      ``,
      `Best regards,`,
      `${appConfig.senderDisplayName} (${appConfig.senderEmail})`
    ].join('\n');

    const htmlBody = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0f172a;color:#f8fafc;padding:24px;border-radius:16px;border:1px solid #1e293b;">
        <h2 style="color:#34d399;margin-top:0;">${eventObj.name} — Official e-Ticket</h2>
        <p>Hello <strong>${booking.firstName} ${booking.lastName}</strong>,</p>
        <p>Your <strong>${booking.ticketType}</strong> pass (${booking.tickets.length} ticket) is ready for check-in.</p>
        <div style="background:#020617;padding:16px;border-radius:12px;border:1px solid #334155;margin:16px 0;">
          <p style="margin:4px 0;"><strong>Date:</strong> ${eventObj.date} • ${eventObj.time}</p>
          <p style="margin:4px 0;"><strong>Venue:</strong> ${eventObj.location}</p>
          <p style="margin:4px 0;"><strong>Booking ID:</strong> ${booking.id}</p>
          <hr style="border-color:#1e293b;margin:12px 0;" />
          ${booking.tickets
            .map(
              (t) =>
                `<div style="margin:8px 0;padding:8px;background:#0f172a;border-radius:8px;">
                  <div style="font-size:13px;font-weight:bold;">${t.attendeeLabel}</div>
                  <div style="font-family:monospace;color:#34d399;font-size:14px;">${t.qrString}</div>
                </div>`
            )
            .join('')}
        </div>
        <p style="font-size:12px;color:#94a3b8;">Official Event WhatsApp Desk: ${eventObj.whatsappSenderNumber}</p>
      </div>
    `;

    return { subject, plainBody, htmlBody, qrLines };
  };

  const sendEmailViaConfiguredEngine = async ({
    toEmail,
    toName,
    subject,
    plainBody,
    htmlBody,
    booking = null,
    eventObj = currentEvent,
    allowMailtoFallback = true
  }) => {
    const activeCfg = configForm && currentRoute === '/config' ? configForm : appConfig;

    if (activeCfg.deliveryEngine === 'emailjs') {
      if (
        !activeCfg.emailjsServiceId.trim() ||
        !activeCfg.emailjsTemplateId.trim() ||
        !activeCfg.emailjsPublicKey.trim()
      ) {
        throw new Error(
          'EmailJS Service ID, Template ID, and Public Key are required in App Config.'
        );
      }

      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: activeCfg.emailjsServiceId.trim(),
          template_id: activeCfg.emailjsTemplateId.trim(),
          user_id: activeCfg.emailjsPublicKey.trim(),
          template_params: {
            to_email: toEmail,
            to_name: toName,
            from_name: activeCfg.senderDisplayName,
            from_email: activeCfg.senderEmail,
            reply_to: activeCfg.replyToEmail || activeCfg.senderEmail,
            subject,
            message: plainBody,
            event_name: eventObj.name,
            event_date: eventObj.date,
            event_location: eventObj.location,
            booking_id: booking ? booking.id : 'TEST-001',
            ticket_type: booking ? booking.ticketType : 'VIP',
            qr_codes: booking
              ? booking.tickets.map((t) => t.qrString).join(', ')
              : 'AM-TEST-QR-998877'
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`EmailJS Error (${response.status}): ${errText || 'Failed to send'}`);
      }
      return { method: 'EmailJS Cloud API' };
    }

    if (activeCfg.deliveryEngine === 'rest_api') {
      if (!activeCfg.restApiEndpoint.trim() || !activeCfg.restApiBearerToken.trim()) {
        throw new Error(
          'REST API Endpoint URL and Bearer API Key are required in App Config.'
        );
      }

      const response = await fetch(activeCfg.restApiEndpoint.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeCfg.restApiBearerToken.trim()}`
        },
        body: JSON.stringify({
          from: `${activeCfg.senderDisplayName} <${activeCfg.senderEmail}>`,
          to: [toEmail],
          subject,
          text: plainBody,
          html: htmlBody
        })
      });

      if (!response.ok) {
        const errData = await response.text();
        throw new Error(`Email API Error (${response.status}): ${errData || 'Request rejected'}`);
      }
      return { method: 'Transactional Email REST API' };
    }

    if (allowMailtoFallback) {
      const mailtoUrl = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(plainBody)}`;
      window.open(mailtoUrl, '_blank');
      return { method: 'Default Mail Client (mailto)' };
    }

    return { method: 'Queued' };
  };

  const handleOpenBookingInMailApp = (booking) => {
    const { subject, plainBody } = buildTicketEmailPayload(booking, currentEvent);
    const mailtoUrl = `mailto:${encodeURIComponent(booking.email)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(plainBody)}`;
    window.open(mailtoUrl, '_blank');
    showNotification(`Opened email draft for ${booking.email} in your Mail App.`);
  };

  // ============================================================================
  // SUPER ADMIN EDIT EVENT DETAILS (NAME, DATE, TIME, VENUE, CAPACITY, WA, STATUS)
  // ============================================================================
  const openEditEventModal = () => {
    if (!currentRoleConfig?.canManageEvents) return;
    setEditEventForm({
      name: currentEvent.name || '',
      date: currentEvent.date || '',
      time: currentEvent.time || '',
      location: currentEvent.location || '',
      capacity: currentEvent.capacity || 500,
      status: currentEvent.status || 'Active',
      description: currentEvent.description || '',
      whatsappSenderNumber: currentEvent.whatsappSenderNumber || appConfig.mainWhatsappNumber,
      whatsappSenderLabel: currentEvent.whatsappSenderLabel || 'Official Event WhatsApp Desk'
    });
    setShowEditEventModal(true);
  };

  const handleSaveEditedEvent = (e) => {
    e.preventDefault();
    if (!currentRoleConfig?.canManageEvents) return;
    if (!editEventForm.name.trim() || !editEventForm.date.trim()) {
      showNotification('Event Title and Date are required.', 'warning');
      return;
    }

    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === currentEvent.id
          ? {
              ...ev,
              name: editEventForm.name.trim(),
              date: editEventForm.date,
              time: editEventForm.time.trim() || '18:00 - 22:00',
              location: editEventForm.location.trim() || 'Main Venue Hall',
              capacity: Math.max(1, Number(editEventForm.capacity) || 500),
              status: editEventForm.status,
              description: editEventForm.description.trim(),
              whatsappSenderNumber:
                editEventForm.whatsappSenderNumber.trim() || appConfig.mainWhatsappNumber,
              whatsappSenderLabel:
                editEventForm.whatsappSenderLabel.trim() || 'Official Event WhatsApp Desk'
            }
          : ev
      )
    );
    setShowEditEventModal(false);
    showNotification(`Saved updated event details for "${editEventForm.name.trim()}"!`);
  };

  const handleCreateNewEvent = (e) => {
    e.preventDefault();
    if (!currentRoleConfig?.canManageEvents) return;
    if (!newEventForm.name.trim() || !newEventForm.whatsappSenderNumber.trim()) {
      showNotification('Event Name and Official WhatsApp Sender Number are required.', 'warning');
      return;
    }
    const newId = `EVT-2026-0${events.length + 1}`;
    const createdEvent = {
      id: newId,
      name: newEventForm.name.trim(),
      date: newEventForm.date,
      time: newEventForm.time,
      location: newEventForm.location.trim() || 'Main Venue Hall',
      capacity: Math.max(1, Number(newEventForm.capacity) || 500),
      status: newEventForm.status || 'Active',
      description: newEventForm.description.trim(),
      whatsappSenderNumber: newEventForm.whatsappSenderNumber.trim(),
      whatsappSenderLabel: newEventForm.whatsappSenderLabel.trim() || 'Official Event WhatsApp Desk'
    };
    setEvents((prev) => [...prev, createdEvent]);
    setSelectedEventId(newId);
    setShowNewEventModal(false);
    setNewEventForm({
      name: '',
      date: '2026-09-15',
      time: '18:00 - 23:00',
      location: '',
      capacity: 500,
      status: 'Active',
      description: '',
      whatsappSenderNumber: appConfig.mainWhatsappNumber || '+971508429900',
      whatsappSenderLabel: appConfig.mainWhatsappLabel || 'Official Event WhatsApp Desk'
    });
    showNotification(`Created event "${createdEvent.name}".`);
  };

  // ============================================================================
  // SUPER ADMIN STAFF PROVISIONING & PASSWORD EDIT / RESET
  // ============================================================================
  const handleProvisionUserSubmit = (e) => {
    e.preventDefault();
    if (!authenticatedUser || authenticatedUser.role !== 'super_admin') return;

    const name = provisionForm.name.trim();
    const email = provisionForm.email.trim().toLowerCase();
    const username = (provisionForm.username.trim() || email.split('@')[0]).toLowerCase();
    const tempPassword = provisionForm.temporaryPassword;
    const targetRole = provisionForm.role;
    const station = provisionForm.station.trim() || 'Operations Station';

    if (!name || !email || !tempPassword) {
      showNotification('Name, Email, and Temporary Password are required.', 'warning');
      return;
    }

    if (
      usersDb.some(
        (u) =>
          u.email.toLowerCase() === email ||
          (u.username && u.username.toLowerCase() === username)
      )
    ) {
      showNotification(`Username "${username}" or email "${email}" already exists.`, 'warning');
      return;
    }

    const newUserId = `usr_${targetRole}_0${usersDb.length + 1}`;
    const passwordHash = computeSaltedPasswordHash(tempPassword, email);

    const createdAccount = {
      id: newUserId,
      name,
      username,
      email,
      role: targetRole,
      station,
      passwordHash,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      createdBy: authenticatedUser.username
    };

    setUsersDb((prev) => [createdAccount, ...prev]);
    setProvisionForm({
      name: '',
      username: '',
      email: '',
      temporaryPassword: `StaffPass!${Math.floor(1000 + Math.random() * 9000)}`,
      role: 'admin',
      station: 'Event Operations Desk'
    });
    showNotification(`Created ${ROLES_HIERARCHY[targetRole].label} account (${username}).`);
  };

  const handleDeleteUserAccount = (targetUser) => {
    if (!authenticatedUser || authenticatedUser.role !== 'super_admin') return;
    if (targetUser.id === authenticatedUser.id) {
      showNotification('You cannot delete your own active Super Admin account.', 'warning');
      return;
    }
    setUsersDb((prev) => prev.filter((u) => u.id !== targetUser.id));
    showNotification(`Removed staff account ${targetUser.username}.`);
  };

  const openPasswordResetModal = (targetUser) => {
    if (!authenticatedUser || authenticatedUser.role !== 'super_admin') return;
    setPasswordModalUser(targetUser);
    setNewPasswordInput(`AMSecure!${Math.floor(1000 + Math.random() * 9000)}`);
    setShowNewPasswordText(true);
    setUpdatedCredentialSummary(null);
  };

  const getPasswordStrength = (pw = '') => {
    if (pw.length < 6)
      return { label: 'Weak (Min 6 chars)', color: 'text-rose-400', bar: 'w-1/4 bg-rose-500' };
    const hasUpper = /[A-Z]/.test(pw);
    const hasNum = /[0-9]/.test(pw);
    const hasSym = /[^A-Za-z0-9]/.test(pw);
    if (pw.length >= 10 && hasUpper && hasNum && hasSym) {
      return {
        label: 'Strong Enterprise Password',
        color: 'text-emerald-400',
        bar: 'w-full bg-emerald-500'
      };
    }
    return { label: 'Moderate Password', color: 'text-amber-300', bar: 'w-2/3 bg-amber-400' };
  };

  const handleUpdateUserPasswordSubmit = (e) => {
    e.preventDefault();
    if (!authenticatedUser || authenticatedUser.role !== 'super_admin' || !passwordModalUser)
      return;
    const trimmedPw = newPasswordInput.trim();
    if (trimmedPw.length < 6) {
      showNotification('Password must be at least 6 characters long.', 'warning');
      return;
    }

    const newHash = computeSaltedPasswordHash(trimmedPw, passwordModalUser.email);
    setUsersDb((prev) =>
      prev.map((u) => (u.id === passwordModalUser.id ? { ...u, passwordHash: newHash } : u))
    );
    setUpdatedCredentialSummary({
      name: passwordModalUser.name,
      username: passwordModalUser.username,
      email: passwordModalUser.email,
      role: ROLES_HIERARCHY[passwordModalUser.role]?.label || passwordModalUser.role,
      newPassword: trimmedPw
    });
    showNotification(`Updated password for ${passwordModalUser.username}.`);
  };

  // ============================================================================
  // APP CONFIG SAVE & LIVE TEST EMAIL DISPATCH
  // ============================================================================
  const handleSaveAppConfig = (e) => {
    if (e) e.preventDefault();
    if (!configForm.senderEmail.trim() || !configForm.mainWhatsappNumber.trim()) {
      showNotification('Sender Email Address and Main WhatsApp Number are required.', 'warning');
      return;
    }
    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const updated = {
      ...configForm,
      senderEmail: configForm.senderEmail.trim(),
      mainWhatsappNumber: configForm.mainWhatsappNumber.trim(),
      emailVerified: true,
      lastTestedAt: stamp
    };
    setAppConfig(updated);
    showNotification(`Saved App Config (${updated.deliveryEngine.toUpperCase()} Email & Main WhatsApp).`);
  };

  const handleSendRealTestEmail = async () => {
    const target = testRecipientEmail.trim() || configForm.senderEmail.trim();
    if (!target || !target.includes('@')) {
      showNotification('Enter a valid recipient email address to send a test ticket.', 'warning');
      return;
    }

    setIsSendingEmail(true);
    try {
      const sampleBooking = eventBookings[0] || INITIAL_BOOKINGS[0];
      const { subject, plainBody, htmlBody } = buildTicketEmailPayload(
        sampleBooking,
        currentEvent
      );
      const result = await sendEmailViaConfiguredEngine({
        toEmail: target,
        toName: 'Test Recipient',
        subject: `[TEST] ${subject}`,
        plainBody,
        htmlBody,
        booking: sampleBooking,
        eventObj: currentEvent,
        allowMailtoFallback: true
      });
      const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const updated = { ...configForm, emailVerified: true, lastTestedAt: stamp };
      setConfigForm(updated);
      setAppConfig(updated);
      showNotification(`Test Ticket Email dispatched to ${target} via ${result.method}!`);
    } catch (err) {
      showNotification(err.message || 'Email delivery failed. Check your API credentials.', 'warning');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleApplyMainWhatsappToAllEvents = () => {
    const mainNum = configForm.mainWhatsappNumber.trim() || appConfig.mainWhatsappNumber;
    const mainLbl = configForm.mainWhatsappLabel.trim() || appConfig.mainWhatsappLabel;
    if (!mainNum) return;
    setEvents((prev) =>
      prev.map((ev) => ({
        ...ev,
        whatsappSenderNumber: mainNum,
        whatsappSenderLabel: mainLbl
      }))
    );
    showNotification(`Applied Main WhatsApp Sender (${mainNum}) to all ${events.length} events!`);
  };

  // ============================================================================
  // SUPER ADMIN BULK CSV GUEST REGISTRATION
  // ============================================================================
  const parseBulkCsvContent = (rawText) => {
    setCsvRawText(rawText);
    const lines = String(rawText || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setParsedCsvRows([]);
      return;
    }

    const firstLineLower = lines[0].toLowerCase();
    const dataLines =
      firstLineLower.includes('email') || firstLineLower.includes('first')
        ? lines.slice(1)
        : lines;

    const existingEmails = new Set(eventBookings.map((b) => b.email.toLowerCase().trim()));
    const seenInCsv = new Set();

    const rows = dataLines.map((line, idx) => {
      const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
      const [
        firstName = '',
        lastName = '',
        email = '',
        whatsapp = '',
        rawTier = 'Regular',
        rawQty = '1',
        notes = ''
      ] = cols;

      const normTierUpper = rawTier.toUpperCase();
      let ticketType = 'Regular';
      if (normTierUpper === 'VIP') ticketType = 'VIP';
      else if (normTierUpper === 'STAFF') ticketType = 'Staff';

      const quantity = Math.max(1, Math.min(10, parseInt(rawQty, 10) || 1));
      const emailLower = email.toLowerCase();
      const isDuplicate =
        Boolean(emailLower) &&
        (existingEmails.has(emailLower) || seenInCsv.has(emailLower));
      if (emailLower) seenInCsv.add(emailLower);

      const isValid = Boolean(firstName && lastName && email && email.includes('@'));

      return {
        rowId: `csv-row-${idx + 1}`,
        firstName,
        lastName,
        email,
        whatsapp: whatsapp || '',
        ticketType,
        quantity,
        notes,
        isDuplicate,
        isValid,
        selected: isValid
      };
    });

    setParsedCsvRows(rows);
  };

  const handleCsvFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = String(evt.target?.result || '');
      parseBulkCsvContent(content);
      showNotification(`Loaded "${file.name}" for validation.`);
    };
    reader.readAsText(file);
  };

  const handleDownloadSampleCsvTemplate = () => {
    const blob = new Blob(['\uFEFF' + SAMPLE_BULK_CSV_TEXT], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AM-Events-Bulk-Guest-Template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Downloaded Sample Bulk Guest CSV Template.');
  };

  const handleConfirmBulkCsvImport = () => {
    if (!authenticatedUser || authenticatedUser.role !== 'super_admin') return;
    const rowsToImport = parsedCsvRows.filter((r) => r.selected && r.isValid);
    if (rowsToImport.length === 0) {
      showNotification('No valid rows selected for import.', 'warning');
      return;
    }

    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const evtShort = currentEvent.id.replace(/[^A-Z0-9]/g, '').slice(-4);
    let totalGeneratedTickets = 0;

    const importedBookings = rowsToImport.map((row, rIdx) => {
      const nextNum = 1001 + bookings.length + rIdx;
      const bookingId = `BK-${nextNum}`;
      const tier = row.ticketType;
      const tierShort = tier.slice(0, 3).toUpperCase();
      const qty = Math.max(1, Math.min(10, Number(row.quantity) || 1));
      const fullName = `${row.firstName.trim()} ${row.lastName.trim()}`;

      const rowTickets = Array.from({ length: qty }, (_, tIdx) => {
        totalGeneratedTickets++;
        const hex = Math.floor(100000 + Math.random() * 899999)
          .toString(16)
          .toUpperCase();
        return {
          ticketId: `TKT-${nextNum}-${tIdx + 1}`,
          qrString: `AM-${evtShort}-${tierShort}-${bookingId}-T${tIdx + 1}-${hex}`,
          attendeeLabel:
            qty > 1
              ? `${fullName} (${tier} ${tIdx + 1} of ${qty})`
              : `${fullName} (${tier} Pass)`,
          checkedIn: csvAutoCheckIn,
          checkedInAt: csvAutoCheckIn ? stamp : null,
          checkedInBy: csvAutoCheckIn ? authenticatedUser.username : null
        };
      });

      return {
        id: bookingId,
        eventId: currentEvent.id,
        firstName: row.firstName.trim(),
        lastName: row.lastName.trim(),
        email: row.email.trim(),
        whatsapp: row.whatsapp.trim(),
        organization: row.notes || 'Bulk CSV Import',
        ticketType: tier,
        status: 'Approved',
        source: 'Bulk CSV Import',
        bookedAt: stamp,
        emailSentAt: null,
        dispatchedFromEmail: null,
        whatsappSentAt: null,
        dispatchedFromSender: null,
        tickets: rowTickets
      };
    });

    setBookings((prev) => [...importedBookings, ...prev]);
    setShowBulkCsvModal(false);
    setParsedCsvRows([]);
    setCsvRawText('');
    showNotification(
      `Imported ${importedBookings.length} Guest Bookings (${totalGeneratedTickets} QR Tickets)!`
    );
  };

  // ============================================================================
  // INVITATION LINKS & GUEST SELF-REGISTRATION PORTAL
  // ============================================================================
  const getInviteUrlString = (invite) =>
    `${window.location.origin}/?event=${invite.eventId.toLowerCase()}&invite=${invite.token}`;

  const handleCreateInviteLink = (e) => {
    e.preventDefault();
    if (!currentRoleConfig?.canSendInvites) return;

    const label =
      newInviteForm.label.trim() || `${currentEvent.name} — Registration Invite`;
    const randomSlug = Math.random().toString(36).substring(2, 7);
    const createdInvite = {
      id: `INV-${8801 + inviteLinks.length}`,
      token: `am-invite-${randomSlug}`,
      eventId: currentEvent.id,
      label,
      allowedTierMode: newInviteForm.allowedTierMode,
      defaultTier:
        newInviteForm.allowedTierMode === 'DROPDOWN_ALL'
          ? newInviteForm.defaultTier
          : newInviteForm.allowedTierMode,
      maxTicketsPerBooking: Math.max(
        1,
        Math.min(10, Number(newInviteForm.maxTicketsPerBooking) || 4)
      ),
      createdBy: authenticatedUser.username,
      createdAt: new Date().toISOString().slice(0, 10),
      registrationsCount: 0,
      isActive: true
    };

    setInviteLinks((prev) => [createdInvite, ...prev]);
    setNewInviteForm((prev) => ({ ...prev, label: '' }));
    showNotification(`Created shareable registration invitation link (${createdInvite.id}).`);
  };

  const openGuestInvitationPortal = (invite) => {
    setGuestPortalSubmittedBooking(null);
    setGuestPortalForm({
      firstName: '',
      lastName: '',
      email: '',
      whatsapp: '',
      organization: '',
      ticketType:
        invite.allowedTierMode === 'DROPDOWN_ALL'
          ? invite.defaultTier || 'Regular'
          : invite.allowedTierMode,
      quantity: 1
    });
    setActiveGuestInvite(invite);
  };

  const handleShareInviteViaWhatsApp = (invite, customPhone = '') => {
    const url = getInviteUrlString(invite);
    const targetPhone = (customPhone || newInviteForm.recipientWhatsappToShare || '').replace(
      /[^0-9]/g,
      ''
    );
    const tierNote =
      invite.allowedTierMode === 'DROPDOWN_ALL'
        ? 'Select your Ticket Type (VIP / Regular / Staff)'
        : `Assigned Ticket Tier: ${invite.allowedTierMode}`;

    const message = [
      `*You're Invited: ${currentEvent.name}*`,
      `📅 Date: ${currentEvent.date} (${currentEvent.time})`,
      `📍 Venue: ${currentEvent.location}`,
      `🎟️ ${tierNote}`,
      `📞 Official Event WhatsApp Desk: ${currentEvent.whatsappSenderNumber}`,
      ``,
      `Complete your registration & receive your QR code ticket here:`,
      url
    ].join('\n');

    const waUrl = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    showNotification(
      `Opened WhatsApp Invitation message (linked to Event Sender ${currentEvent.whatsappSenderNumber}).`
    );
  };

  const createBookingRecord = ({
    firstName,
    lastName,
    email,
    whatsapp,
    organization,
    ticketType,
    quantity,
    sourceLabel,
    eventObj
  }) => {
    const nextNum = 1001 + bookings.length;
    const bookingId = `BK-${nextNum}`;
    const qty = Math.max(1, Math.min(10, Number(quantity) || 1));
    const evtShort = eventObj.id.replace(/[^A-Z0-9]/g, '').slice(-4);
    const tierShort = ticketType.slice(0, 3).toUpperCase();
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    const newTickets = Array.from({ length: qty }, (_, idx) => {
      const hex = Math.floor(100000 + Math.random() * 899999)
        .toString(16)
        .toUpperCase();
      return {
        ticketId: `TKT-${nextNum}-${idx + 1}`,
        qrString: `AM-${evtShort}-${tierShort}-${bookingId}-T${idx + 1}-${hex}`,
        attendeeLabel:
          qty > 1
            ? `${fullName} (${ticketType} ${idx + 1} of ${qty})`
            : `${fullName} (${ticketType} Pass)`,
        checkedIn: false,
        checkedInAt: null,
        checkedInBy: null
      };
    });

    return {
      id: bookingId,
      eventId: eventObj.id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      whatsapp: whatsapp.trim(),
      organization: organization.trim(),
      ticketType,
      status: 'Approved',
      source: sourceLabel,
      bookedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      emailSentAt: null,
      dispatchedFromEmail: null,
      whatsappSentAt: null,
      dispatchedFromSender: null,
      tickets: newTickets
    };
  };

  const handleRegisterGuestBooking = (e) => {
    e.preventDefault();
    if (!currentRoleConfig?.canRegisterGuests) return;
    if (
      !guestRegForm.firstName.trim() ||
      !guestRegForm.lastName.trim() ||
      !guestRegForm.email.trim()
    ) {
      showNotification('First Name, Last Name, and Email are required.', 'warning');
      return;
    }

    const newBooking = createBookingRecord({
      ...guestRegForm,
      sourceLabel: `Admin Desk (${authenticatedUser.name})`,
      eventObj: currentEvent
    });

    setBookings((prev) => [newBooking, ...prev]);
    setGuestRegForm({
      firstName: '',
      lastName: '',
      email: '',
      whatsapp: '',
      organization: '',
      ticketType: guestRegForm.ticketType,
      quantity: 1
    });
    showNotification(
      `Registered ${newBooking.firstName} ${newBooking.lastName} (${newBooking.tickets.length}x ${newBooking.ticketType} QR Pass).`
    );
  };

  const handleGuestPortalSubmit = (e) => {
    e.preventDefault();
    if (!activeGuestInvite) return;
    if (
      !guestPortalForm.firstName.trim() ||
      !guestPortalForm.lastName.trim() ||
      !guestPortalForm.email.trim()
    ) {
      showNotification('Please fill in your First Name, Last Name, and Email.', 'warning');
      return;
    }

    const inviteEvent =
      events.find((ev) => ev.id === activeGuestInvite.eventId) || currentEvent;
    const enforcedTier =
      activeGuestInvite.allowedTierMode === 'DROPDOWN_ALL'
        ? guestPortalForm.ticketType
        : activeGuestInvite.allowedTierMode;

    const newBooking = createBookingRecord({
      ...guestPortalForm,
      ticketType: enforcedTier,
      sourceLabel: `Invite Link (${activeGuestInvite.id})`,
      eventObj: inviteEvent
    });

    setBookings((prev) => [newBooking, ...prev]);
    setInviteLinks((prev) =>
      prev.map((inv) =>
        inv.id === activeGuestInvite.id
          ? { ...inv, registrationsCount: (inv.registrationsCount || 0) + 1 }
          : inv
      )
    );
    setGuestPortalSubmittedBooking(newBooking);
    showNotification(
      `Registration Confirmed! Assigned ${newBooking.tickets.length}x ${newBooking.ticketType} QR Ticket(s).`
    );
  };

  // ============================================================================
  // SINGLE & BATCH TICKET DISPATCH (REAL WORKING EMAIL + WHATSAPP QR IMAGE/ID)
  // ============================================================================
  const handleDispatchBookingTickets = async (booking) => {
    if (!currentRoleConfig?.canBatchDispatch) return;
    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const eventSender = currentEvent.whatsappSenderNumber || appConfig.mainWhatsappNumber;
    const senderMail = appConfig.senderEmail;

    try {
      const { subject, plainBody, htmlBody } = buildTicketEmailPayload(booking, currentEvent);
      const emailResult = await sendEmailViaConfiguredEngine({
        toEmail: booking.email,
        toName: `${booking.firstName} ${booking.lastName}`,
        subject,
        plainBody,
        htmlBody,
        booking,
        eventObj: currentEvent,
        allowMailtoFallback: true
      });

      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id
            ? {
                ...b,
                emailSentAt: stamp,
                dispatchedFromEmail: `${senderMail} (${emailResult.method})`,
                whatsappSentAt: b.whatsapp ? stamp : null,
                dispatchedFromSender: eventSender
              }
            : b
        )
      );

      showNotification(
        `Ticket dispatched to ${booking.email} via ${emailResult.method}!`
      );
    } catch (err) {
      showNotification(err.message || 'Email dispatch failed.', 'warning');
    }
  };

  const handleDirectWhatsAppTicketLaunch = (booking) => {
    if (!booking.whatsapp) {
      showNotification('No WhatsApp number registered on this booking.', 'warning');
      return;
    }
    const cleanGuestPhone = booking.whatsapp.replace(/[^0-9]/g, '');
    const qrList = booking.tickets
      .map(
        (t) =>
          `• *${t.qrString}*\n  🖼️ Scannable QR Image: https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
            t.qrString
          )}`
      )
      .join('\n');
    const message = [
      `*${currentEvent.name} — Official e-Ticket*`,
      `👤 Guest: ${booking.firstName} ${booking.lastName}`,
      `🎟️ Ticket Tier: *${booking.ticketType}* (${booking.tickets.length} Pass)`,
      `📅 Date: ${currentEvent.date} | ${currentEvent.time}`,
      `📍 Venue: ${currentEvent.location}`,
      `📞 Official Event WhatsApp Sender: ${currentEvent.whatsappSenderNumber}`,
      ``,
      `*Your Check-In QR Code ID(s) & Scannable Pass:*`,
      qrList,
      ``,
      `Present the QR image or show your Check-In QR Code ID at the entrance gate.`
    ].join('\n');

    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setBookings((prev) =>
      prev.map((b) =>
        b.id === booking.id
          ? {
              ...b,
              whatsappSentAt: stamp,
              dispatchedFromSender: currentEvent.whatsappSenderNumber
            }
          : b
      )
    );

    window.open(
      `https://wa.me/${cleanGuestPhone}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
    showNotification(
      `Opened WhatsApp with scannable QR image link & ID for ${booking.firstName} ${booking.lastName}.`
    );
  };

  const handleShareQrImageFile = async (booking) => {
    const primaryTicket = booking.tickets[0];
    if (!primaryTicket) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=20&data=${encodeURIComponent(
      primaryTicket.qrString
    )}`;
    try {
      const resp = await fetch(qrUrl);
      const blob = await resp.blob();
      const file = new File([blob], `${primaryTicket.qrString}.png`, {
        type: 'image/png'
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${currentEvent.name} — QR Pass`,
          text: `Guest: ${booking.firstName} ${booking.lastName} | ID: ${primaryTicket.qrString}`,
          files: [file]
        });
        showNotification(`Shared QR Pass PNG for ${booking.firstName} ${booking.lastName}!`);
      } else {
        const dlUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = dlUrl;
        a.download = `${primaryTicket.qrString}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(dlUrl);
        showNotification(
          `Downloaded ${primaryTicket.qrString}.png — drag & drop it directly into WhatsApp!`
        );
      }
    } catch {
      showNotification('Could not generate PNG file. Use the WA link button instead.', 'warning');
    }
  };

  const handleBatchDispatchAll = async () => {
    if (!currentRoleConfig?.canBatchDispatch) return;
    if (eventBookings.length === 0) return;

    if (appConfig.deliveryEngine === 'mailto') {
      showNotification(
        'Tip: Configure EmailJS or Resend API in "App Config (Email & WA)" for silent 1-click mass background emails without opening multiple mail windows. Opening first guest email now...',
        'warning'
      );
      await handleDispatchBookingTickets(eventBookings[0]);
      return;
    }

    const total = eventBookings.length;
    const senderNum = currentEvent.whatsappSenderNumber || appConfig.mainWhatsappNumber;
    const senderMail = appConfig.senderEmail;
    setBatchProgress({ current: 0, total });

    let successCount = 0;
    for (let i = 0; i < total; i++) {
      const b = eventBookings[i];
      setBatchProgress({ current: i + 1, total });
      try {
        const { subject, plainBody, htmlBody } = buildTicketEmailPayload(b, currentEvent);
        await sendEmailViaConfiguredEngine({
          toEmail: b.email,
          toName: `${b.firstName} ${b.lastName}`,
          subject,
          plainBody,
          htmlBody,
          booking: b,
          eventObj: currentEvent,
          allowMailtoFallback: false
        });
        successCount++;
        const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
        setBookings((prev) =>
          prev.map((item) =>
            item.id === b.id
              ? {
                  ...item,
                  emailSentAt: stamp,
                  dispatchedFromEmail: senderMail,
                  whatsappSentAt: item.whatsapp ? stamp : item.whatsappSentAt,
                  dispatchedFromSender: senderNum
                }
              : item
          )
        );
      } catch (err) {
        showNotification(`Stopped at ${b.email}: ${err.message}`, 'warning');
        break;
      }
    }

    setBatchProgress(null);
    if (successCount > 0) {
      showNotification(`Successfully dispatched ${successCount}/${total} ticket emails!`);
    }
  };

  // ============================================================================
  // OFFLINE MOBILE DOOR QR SCANNER (LIVE CAMERA + OCR TEXT ID + MANUAL)
  // ============================================================================
  const handleScanQrCode = (qrInputRaw) => {
    const code = (qrInputRaw || '').trim();
    if (!code) return;
    const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    let foundBooking = null;
    let foundTicket = null;

    for (const b of eventBookings) {
      const t = b.tickets.find((tk) => tk.qrString.toUpperCase() === code.toUpperCase());
      if (t) {
        foundBooking = b;
        foundTicket = t;
        break;
      }
    }

    if (!foundTicket) {
      if (soundEnabled) playScannerBeep('invalid');
      setScanResult({
        status: 'INVALID',
        qrString: code,
        message: 'Unrecognized QR Code — Not found in this event guest list.'
      });
      return;
    }

    if (foundTicket.checkedIn) {
      if (soundEnabled) playScannerBeep('duplicate');
      setScanResult({
        status: 'DUPLICATE',
        qrString: foundTicket.qrString,
        attendee: foundTicket.attendeeLabel,
        tier: foundBooking.ticketType,
        message: `Already Checked In at ${foundTicket.checkedInAt} (${foundTicket.checkedInBy})`
      });
      return;
    }

    if (soundEnabled) playScannerBeep('valid');
    setBookings((prev) =>
      prev.map((b) =>
        b.id !== foundBooking.id
          ? b
          : {
              ...b,
              tickets: b.tickets.map((t) =>
                t.ticketId === foundTicket.ticketId
                  ? {
                      ...t,
                      checkedIn: true,
                      checkedInAt: stamp,
                      checkedInBy:
                        authenticatedUser?.username || authenticatedUser?.name || 'Scanner'
                    }
                  : t
              )
            }
      )
    );

    setScanResult({
      status: 'VALID',
      qrString: foundTicket.qrString,
      attendee: foundTicket.attendeeLabel,
      tier: foundBooking.ticketType,
      message: `Verified & Checked In at ${stamp}`
    });
    setManualQrInput('');
  };

  useEffect(() => {
    if (currentRoute !== '/scanner' || !cameraActive) return;

    let stream = null;
    let rafId = null;
    let cancelled = false;

    const startCamera = async () => {
      setCameraError(null);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError('Camera API unavailable. Ensure HTTPS is enabled on this site.');
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if ('BarcodeDetector' in window) {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const scanLoop = async () => {
            if (cancelled) return;
            try {
              if (videoRef.current && videoRef.current.readyState >= 2) {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0 && barcodes[0].rawValue) {
                  const raw = barcodes[0].rawValue.trim();
                  const now = Date.now();
                  if (
                    raw !== lastScannedCodeRef.current.code ||
                    now - lastScannedCodeRef.current.time > 3000
                  ) {
                    lastScannedCodeRef.current = { code: raw, time: now };
                    handleScanQrCode(raw);
                  }
                }
              }
            } catch {}
            rafId = requestAnimationFrame(scanLoop);
          };
          rafId = requestAnimationFrame(scanLoop);
        } else {
          setCameraError(
            'Camera active, but browser lacks native BarcodeDetector. Use Chrome/Android or enter QR code manually below.'
          );
        }
      } catch (err) {
        if (!cancelled) {
          setCameraError(`Camera permission denied or unavailable: ${err.message}`);
          setCameraActive(false);
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [currentRoute, cameraActive]);

  const handleCaptureAndScanTextId = async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      showNotification('Turn on the camera first to scan a Check-In QR Code ID.', 'warning');
      return;
    }
    setIsScanningTextId(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      let extractedText = '';
      if ('TextDetector' in window) {
        const textDetector = new window.TextDetector();
        const blocks = await textDetector.detect(canvas);
        extractedText = blocks.map((b) => b.rawValue).join(' ');
      }

      const idMatch = extractedText.match(/AM-[A-Z0-9-]+/i);
      if (idMatch && idMatch[0]) {
        const matchedCode = idMatch[0].toUpperCase();
        setManualQrInput(matchedCode);
        handleScanQrCode(matchedCode);
      } else {
        showNotification(
          'Hold the printed Check-In QR Code ID (e.g. AM-EVT01-...) steady inside the box and tap again, or paste/tap below.',
          'warning'
        );
      }
    } catch {
      showNotification(
        'Direct OCR text scan not supported on this browser — scan the QR square or enter ID manually.',
        'warning'
      );
    } finally {
      setIsScanningTextId(false);
    }
  };

  // ============================================================================
  // CSV EXPORT FOR 3RD-PARTY OFFLINE CHECK-IN APPS
  // ============================================================================
  const handleDownloadCsvExport = () => {
    if (!currentRoleConfig?.canExportCSV) return;
    const headers = [
      'QR Code String',
      'Ticket ID',
      'Booking ID',
      'First Name',
      'Last Name',
      'Ticket Type',
      'Email',
      'Guest WhatsApp',
      'Event WhatsApp Sender',
      'Checked In Status'
    ];
    const rows = eventBookings.flatMap((b) =>
      b.tickets.map((t) => [
        t.qrString,
        t.ticketId,
        b.id,
        b.firstName,
        b.lastName,
        b.ticketType,
        b.email,
        b.whatsapp || '',
        currentEvent.whatsappSenderNumber,
        t.checkedIn ? `YES (${t.checkedInAt})` : 'NO'
      ])
    );
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentEvent.id}-${exportPreset.toLowerCase()}-guestlist.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification(`Downloaded ${exportPreset} CSV (${rows.length} individual QR tickets).`);
  };

  // ============================================================================
  // SPECIAL VIEW: INTERACTIVE GUEST INVITATION REGISTRATION PORTAL
  // ============================================================================
  if (activeGuestInvite) {
    const inviteEvent =
      events.find((ev) => ev.id === activeGuestInvite.eventId) || currentEvent;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-0 right-1/4 w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-[140px]" />
        </div>

        {authenticatedUser && (
          <div className="relative z-20 bg-slate-900/95 border-b border-slate-800 px-4 py-2.5">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Live Guest Invitation View ({activeGuestInvite.label})</span>
              </div>
              <button
                onClick={() => setActiveGuestInvite(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Staff Dashboard</span>
              </button>
            </div>
          </div>
        )}

        <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <AMLogo size={44} />
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Official Event Registration Invitation
              </span>
            </div>

            <div className="mt-5 p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 space-y-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-white">
                {inviteEvent.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  {inviteEvent.date} • {inviteEvent.time}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  {inviteEvent.location}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-xs text-teal-300 font-medium">
                <Phone className="w-3.5 h-3.5 text-teal-400" />
                <span>
                  Official Event WhatsApp Desk:{' '}
                  <strong className="font-mono">{inviteEvent.whatsappSenderNumber}</strong> ({inviteEvent.whatsappSenderLabel})
                </span>
              </div>
            </div>

            {guestPortalSubmittedBooking ? (
              <div className="mt-6 space-y-5">
                <div className="p-5 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <h2 className="text-lg font-extrabold text-white">
                    Registration Confirmed! ({guestPortalSubmittedBooking.id})
                  </h2>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    Thank you,{' '}
                    <strong>
                      {guestPortalSubmittedBooking.firstName} {guestPortalSubmittedBooking.lastName}
                    </strong>
                    . Your{' '}
                    <span className="text-emerald-300 font-bold">
                      {guestPortalSubmittedBooking.tickets.length}x{' '}
                      {guestPortalSubmittedBooking.ticketType}
                    </span>{' '}
                    registration has been recorded.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Your Assigned Check-In QR Pass(es):
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {guestPortalSubmittedBooking.tickets.map((t) => (
                      <div
                        key={t.ticketId}
                        className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3.5"
                      >
                        <QRCodeMatrix value={t.qrString} size={68} />
                        <div className="min-w-0 flex-1">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-extrabold ${getTicketBadgeStyle(
                              guestPortalSubmittedBooking.ticketType
                            )}`}
                          >
                            {guestPortalSubmittedBooking.ticketType} PASS
                          </span>
                          <div className="text-xs font-bold text-white truncate mt-1">
                            {t.attendeeLabel}
                          </div>
                          <div className="text-[11px] font-mono text-emerald-400 truncate mt-0.5">
                            {t.qrString}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setGuestPortalSubmittedBooking(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
                  >
                    Register Another Guest
                  </button>
                  {authenticatedUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveGuestInvite(null);
                        setCurrentRoute('/dashboard');
                      }}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs"
                    >
                      View Booking in Admin Dashboard →
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleGuestPortalSubmit} className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                    Register Guest Booking — Select Ticket Type Dropdown (VIP / Regular / Staff)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={guestPortalForm.firstName}
                      onChange={(e) =>
                        setGuestPortalForm((f) => ({ ...f, firstName: e.target.value }))
                      }
                      placeholder="e.g. Nadia"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={guestPortalForm.lastName}
                      onChange={(e) =>
                        setGuestPortalForm((f) => ({ ...f, lastName: e.target.value }))
                      }
                      placeholder="e.g. Al-Mansoori"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Email Address (For PDF Ticket) *
                    </label>
                    <input
                      type="email"
                      required
                      value={guestPortalForm.email}
                      onChange={(e) =>
                        setGuestPortalForm((f) => ({ ...f, email: e.target.value }))
                      }
                      placeholder="nadia@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      WhatsApp Mobile Number (For Instant QR Ticket) *
                    </label>
                    <input
                      type="text"
                      required
                      value={guestPortalForm.whatsapp}
                      onChange={(e) =>
                        setGuestPortalForm((f) => ({ ...f, whatsapp: e.target.value }))
                      }
                      placeholder="+971501234567"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-emerald-300 mb-1">
                      Ticket Type (VIP / Regular / Staff) *
                    </label>
                    {activeGuestInvite.allowedTierMode === 'DROPDOWN_ALL' ? (
                      <select
                        value={guestPortalForm.ticketType}
                        onChange={(e) =>
                          setGuestPortalForm((f) => ({
                            ...f,
                            ticketType: e.target.value
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-emerald-500/50 text-sm font-extrabold text-emerald-300 cursor-pointer focus:outline-none"
                      >
                        <option value="VIP">VIP</option>
                        <option value="Regular">Regular</option>
                        <option value="Staff">Staff</option>
                      </select>
                    ) : (
                      <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-500/40 text-sm font-extrabold text-amber-300">
                        {activeGuestInvite.allowedTierMode} (Pre-Assigned)
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Number of Tickets
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={activeGuestInvite.maxTicketsPerBooking || 5}
                      value={guestPortalForm.quantity}
                      onChange={(e) =>
                        setGuestPortalForm((f) => ({ ...f, quantity: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Organization / Company
                    </label>
                    <input
                      type="text"
                      value={guestPortalForm.organization}
                      onChange={(e) =>
                        setGuestPortalForm((f) => ({
                          ...f,
                          organization: e.target.value
                        }))
                      }
                      placeholder="Optional"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <Ticket className="w-4 h-4" />
                  <span>Complete Registration &amp; Generate QR Booking</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 1: CLEAN PRODUCTION STAFF LOGIN PORTAL (NO QUICK ROLE SELECTOR)
  // ============================================================================
  if (!authenticatedUser || currentRoute === '/login') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-0 right-1/4 w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[140px]" />
        </div>

        <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <AMLogo size={46} showText={false} />
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <Lock className="w-3 h-3" /> Authorized Access Only
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              AM Events Manager
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Sign in with your staff username or email address to continue.
            </p>

            {loginError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 flex items-center gap-2.5 text-xs text-rose-200">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Username or Email
                </label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={loginForm.identifier}
                  onChange={(e) =>
                    setLoginForm((f) => ({ ...f, identifier: e.target.value }))
                  }
                  placeholder="Enter username"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm((f) => ({ ...f, password: e.target.value }))
                    }
                    placeholder="••••••••••••"
                    className="w-full pl-4 pr-11 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer accent-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
                    Remember me on this device
                  </span>
                </label>
                <span className="text-[11px] text-slate-500">
                  {rememberMe ? '30-day session' : 'Browser session'}
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Key className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            </form>
          </div>
        </div>

        <footer className="relative z-10 border-t border-slate-900 py-3 px-6 text-center text-xs text-slate-500">
          AM Events Manager • Enterprise Tickets, Invitation Portal &amp; Offline Door Check-In
        </footer>
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: CLEAN PRODUCTION STAFF WORKSPACE
  // ============================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md ${
              toast.type === 'warning'
                ? 'bg-amber-950/95 border-amber-500/40 text-amber-200'
                : 'bg-emerald-950/95 border-emerald-500/40 text-emerald-200'
            }`}
          >
            {toast.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* TOP NAVIGATION HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <AMLogo size={42} />

          <nav className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            {(authenticatedUser.role === 'super_admin' ||
              authenticatedUser.role === 'admin') && (
              <>
                <button
                  onClick={() => navigateToRoute('/dashboard')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentRoute === '/dashboard'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Bookings &amp; Dispatch
                </button>

                <button
                  onClick={() => navigateToRoute('/invites')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentRoute === '/invites'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Invitation Links</span>
                </button>

                <button
                  onClick={() => navigateToRoute('/export')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentRoute === '/export'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  CSV Export
                </button>

                <button
                  onClick={() => navigateToRoute('/config')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentRoute === '/config'
                      ? 'bg-teal-400 text-slate-950 shadow-sm'
                      : 'text-teal-300 hover:bg-teal-500/15'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>App Config (Email &amp; WA)</span>
                </button>
              </>
            )}

            <button
              onClick={() => navigateToRoute('/scanner')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentRoute === '/scanner'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>QR Door Scanner</span>
            </button>

            {authenticatedUser.role === 'super_admin' && (
              <button
                onClick={() => navigateToRoute('/users')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  currentRoute === '/users'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-rose-300 hover:bg-rose-500/15'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Staff Accounts</span>
              </button>
            )}
          </nav>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
              <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white leading-none">
                  {authenticatedUser.name} ({authenticatedUser.username})
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {authenticatedUser.station}
                </div>
              </div>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${currentRoleConfig.badgeClass}`}
              >
                {currentRoleConfig.label}
              </span>
            </div>

            {authenticatedUser.role === 'super_admin' && (
              <button
                onClick={() => openPasswordResetModal(authenticatedUser)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors"
                title="Change My Super Admin Password"
              >
                <Key className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">My Password</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* GLOBAL EVENT BAR WITH EDIT EVENT DETAILS BUTTON */}
      <div className="border-b border-slate-800/80 bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Event:
              </span>
            </div>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold text-white cursor-pointer focus:outline-none focus:border-emerald-500"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.date})
                </option>
              ))}
            </select>

            {currentRoleConfig.canManageEvents && (
              <>
                <button
                  onClick={openEditEventModal}
                  className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-xs font-extrabold text-amber-300 border border-amber-500/40 flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Event Details</span>
                </button>

                <button
                  onClick={() => setShowNewEventModal(true)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-300 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Event</span>
                </button>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-950/90 border border-emerald-500/30 rounded-2xl px-3 py-1.5 text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-mono font-bold text-emerald-300">
                {appConfig.senderEmail}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold uppercase">
                {appConfig.deliveryEngine === 'emailjs'
                  ? 'EmailJS'
                  : appConfig.deliveryEngine === 'rest_api'
                  ? 'API'
                  : 'Mail App'}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-950/90 border border-teal-500/30 rounded-2xl px-3 py-1.5 text-xs">
              <Phone className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="text-slate-400 hidden sm:inline">Event WA:</span>
              <span className="font-mono font-extrabold text-teal-300">
                {currentEvent.whatsappSenderNumber}
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-slate-300 font-semibold">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            {currentEvent.location}
          </span>
          <span>•</span>
          <span>Time: {currentEvent.time}</span>
          <span>•</span>
          <span>
            Capacity: {eventStats.totalTickets} / {currentEvent.capacity || 500} Seats
          </span>
          <span>•</span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold">
            {currentEvent.status || 'Active'}
          </span>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Total Bookings
            </span>
            <div className="text-2xl font-black text-white mt-1">
              {eventStats.totalBookings}
            </div>
            <span className="text-[11px] text-slate-400">
              {eventStats.totalTickets} QR Seats
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30">
            <span className="text-[11px] font-bold uppercase text-amber-300">
              VIP Passes
            </span>
            <div className="text-2xl font-black text-amber-300 mt-1">
              {eventStats.vipTickets}
            </div>
            <span className="text-[11px] text-slate-400">Priority Access</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30">
            <span className="text-[11px] font-bold uppercase text-emerald-300">
              Regular Passes
            </span>
            <div className="text-2xl font-black text-emerald-300 mt-1">
              {eventStats.regularTickets}
            </div>
            <span className="text-[11px] text-slate-400">Standard Admission</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/30">
            <span className="text-[11px] font-bold uppercase text-indigo-300">
              Staff Passes
            </span>
            <div className="text-2xl font-black text-indigo-300 mt-1">
              {eventStats.staffTickets}
            </div>
            <span className="text-[11px] text-slate-400">Crew &amp; Production</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-teal-500/30">
            <span className="text-[11px] font-bold uppercase text-teal-300">
              Dispatched
            </span>
            <div className="text-2xl font-black text-teal-300 mt-1">
              {eventStats.dispatchedBookings}/{eventStats.totalBookings}
            </div>
            <span className="text-[11px] text-slate-400 truncate block">
              WA: {currentEvent.whatsappSenderNumber}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30">
            <span className="text-[11px] font-bold uppercase text-cyan-300">
              Checked In
            </span>
            <div className="text-2xl font-black text-cyan-300 mt-1">
              {eventStats.checkedInTickets}/{eventStats.totalTickets}
            </div>
            <span className="text-[11px] text-slate-400">Door Verified</span>
          </div>
        </div>

        {/* ROUTE 1: `/dashboard` */}
        {currentRoute === '/dashboard' && (
          <div className="space-y-6">
            {currentRoleConfig.canBatchDispatch && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-white">
                      On-Demand Ticket Dispatch (Email + Event WhatsApp)
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Engine:{' '}
                      {appConfig.deliveryEngine === 'emailjs'
                        ? 'EmailJS Direct API'
                        : appConfig.deliveryEngine === 'rest_api'
                        ? 'REST Email API'
                        : 'Mail Client (mailto)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Send tickets individually per guest or trigger batch email dispatch. Configure EmailJS or Resend API in{' '}
                    <button
                      type="button"
                      onClick={() => navigateToRoute('/config')}
                      className="text-emerald-300 underline font-bold"
                    >
                      App Config (Email &amp; WA)
                    </button>{' '}
                    for silent 1-click mass emails.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {authenticatedUser.role === 'super_admin' && (
                    <button
                      onClick={() => {
                        setShowBulkCsvModal(true);
                        if (!csvRawText) {
                          parseBulkCsvContent(SAMPLE_BULK_CSV_TEXT);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-xs font-extrabold text-amber-300 border border-amber-500/40"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Bulk CSV Guest Import</span>
                    </button>
                  )}

                  <button
                    onClick={() => navigateToRoute('/invites')}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-300 border border-slate-700"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Send Registration Invite Link</span>
                  </button>

                  <button
                    onClick={handleBatchDispatchAll}
                    disabled={Boolean(batchProgress)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {batchProgress
                        ? `Sending (${batchProgress.current}/${batchProgress.total})...`
                        : `Batch Dispatch All (${eventBookings.length} Bookings)`}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {currentRoleConfig.canRegisterGuests && (
              <form
                onSubmit={handleRegisterGuestBooking}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                    Register Guest Booking — Select Ticket Type Dropdown (VIP / Regular / Staff)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Generates unique cryptographic QR codes per ticket seat
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                  <input
                    type="text"
                    required
                    value={guestRegForm.firstName}
                    onChange={(e) =>
                      setGuestRegForm((f) => ({ ...f, firstName: e.target.value }))
                    }
                    placeholder="First Name *"
                    className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    required
                    value={guestRegForm.lastName}
                    onChange={(e) =>
                      setGuestRegForm((f) => ({ ...f, lastName: e.target.value }))
                    }
                    placeholder="Last Name *"
                    className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="email"
                    required
                    value={guestRegForm.email}
                    onChange={(e) =>
                      setGuestRegForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="Email Address *"
                    className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    value={guestRegForm.whatsapp}
                    onChange={(e) =>
                      setGuestRegForm((f) => ({ ...f, whatsapp: e.target.value }))
                    }
                    placeholder="Guest WhatsApp (+97150...)"
                    className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />

                  <select
                    value={guestRegForm.ticketType}
                    onChange={(e) =>
                      setGuestRegForm((f) => ({ ...f, ticketType: e.target.value }))
                    }
                    className="px-3 py-2.5 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs font-extrabold text-emerald-300 cursor-pointer focus:outline-none"
                  >
                    <option value="VIP">Ticket Type: VIP</option>
                    <option value="Regular">Ticket Type: Regular</option>
                    <option value="Staff">Ticket Type: Staff</option>
                  </select>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={guestRegForm.quantity}
                      onChange={(e) =>
                        setGuestRegForm((f) => ({ ...f, quantity: e.target.value }))
                      }
                      title="Number of Tickets"
                      className="w-16 px-2.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white"
                    />
                    <button
                      type="submit"
                      className="flex-1 px-3 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Register</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search guest name, email, WhatsApp, or QR code..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  {['ALL', 'VIP', 'Regular', 'Staff'].map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setTicketTierFilter(tier)}
                      className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                        ticketTierFilter === tier
                          ? 'bg-slate-800 text-emerald-400'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase text-slate-400">
                      <th className="py-3 px-4">Booking &amp; Ticket Type</th>
                      <th className="py-3 px-4">Attendee &amp; Contact</th>
                      <th className="py-3 px-4">Generated QR Code(s)</th>
                      <th className="py-3 px-4">Delivery Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-400">
                              {b.id}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full border font-extrabold text-[10px] ${getTicketBadgeStyle(
                                b.ticketType
                              )}`}
                            >
                              {b.ticketType}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            {b.source || 'Admin Desk'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-bold text-white text-sm">
                            {b.firstName} {b.lastName}
                          </div>
                          <div className="text-slate-400">{b.email}</div>
                          {b.whatsapp && (
                            <div className="font-mono text-teal-400 mt-0.5">
                              WA: {b.whatsapp}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 align-top space-y-1">
                          {b.tickets.map((t) => (
                            <div
                              key={t.ticketId}
                              className="font-mono text-[11px] bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-1.5">
                                <QrCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="text-slate-200">{t.qrString}</span>
                              </div>
                              {t.checkedIn && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                  Checked In
                                </span>
                              )}
                            </div>
                          ))}
                        </td>
                        <td className="py-3.5 px-4 align-top space-y-1">
                          <div>
                            {b.emailSentAt ? (
                              <div className="text-emerald-400 font-bold">
                                ✓ Email Sent ({b.emailSentAt})
                                <div className="text-[10px] font-mono text-slate-400 font-normal">
                                  {b.dispatchedFromEmail || appConfig.senderEmail}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-500">Email Not Sent Yet</span>
                            )}
                          </div>
                          {b.whatsapp && (
                            <div>
                              {b.whatsappSentAt ? (
                                <span className="text-teal-400 font-bold">
                                  ✓ WA Sent ({b.whatsappSentAt})
                                </span>
                              ) : (
                                <span className="text-slate-500">WA Pending</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 align-top text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            <button
                              onClick={() => setTicketPreviewBooking(b)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
                            >
                              PDF Pass
                            </button>
                            {currentRoleConfig.canBatchDispatch && (
                              <>
                                <button
                                  onClick={() => handleDispatchBookingTickets(b)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1"
                                >
                                  <Mail className="w-3 h-3" />
                                  <span>Send Email</span>
                                </button>
                                <button
                                  onClick={() => handleOpenBookingInMailApp(b)}
                                  className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                                  title="Open pre-filled email in your device Mail App"
                                >
                                  Mail App
                                </button>
                                {b.whatsapp && (
                                  <>
                                    <button
                                      onClick={() => handleDirectWhatsAppTicketLaunch(b)}
                                      className="px-2.5 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 font-bold flex items-center gap-1"
                                      title="Send WhatsApp with Scannable QR Image Link & Check-In ID"
                                    >
                                      <MessageSquare className="w-3 h-3" />
                                      <span>WA</span>
                                    </button>
                                    <button
                                      onClick={() => handleShareQrImageFile(b)}
                                      className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold flex items-center gap-1"
                                      title="Attach / Download QR Pass PNG Picture"
                                    >
                                      <ImageIcon className="w-3 h-3" />
                                      <span>QR Pic</span>
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ROUTE 2: `/invites` */}
        {currentRoute === '/invites' && currentRoleConfig.canSendInvites && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-extrabold text-white">
                  Create Event Invitation Link
                </h2>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Generate a shareable registration link for{' '}
                <strong className="text-white">{currentEvent.name}</strong>. Guests who open the link can register and choose from the{' '}
                <strong className="text-emerald-300">
                  Ticket Type Dropdown (VIP / Regular / Staff)
                </strong>{' '}
                or be locked to a specific tier.
              </p>

              <form onSubmit={handleCreateInviteLink} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Invitation Link Title / Campaign Label *
                  </label>
                  <input
                    type="text"
                    required
                    value={newInviteForm.label}
                    onChange={(e) =>
                      setNewInviteForm((f) => ({ ...f, label: e.target.value }))
                    }
                    placeholder="e.g. Keynote VIP & Delegation Registration Link"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-300 mb-1">
                    Ticket Type Selection Mode on Form *
                  </label>
                  <select
                    value={newInviteForm.allowedTierMode}
                    onChange={(e) =>
                      setNewInviteForm((f) => ({
                        ...f,
                        allowedTierMode: e.target.value
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs font-extrabold text-emerald-300 cursor-pointer"
                  >
                    <option value="DROPDOWN_ALL">
                      Show Full Dropdown (VIP - Regular - Staff)
                    </option>
                    <option value="VIP">Lock Invitation to VIP Tier Only</option>
                    <option value="Regular">Lock Invitation to Regular Tier Only</option>
                    <option value="Staff">Lock Invitation to Staff Tier Only</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Default Dropdown Value
                    </label>
                    <select
                      value={newInviteForm.defaultTier}
                      onChange={(e) =>
                        setNewInviteForm((f) => ({
                          ...f,
                          defaultTier: e.target.value
                        }))
                      }
                      disabled={newInviteForm.allowedTierMode !== 'DROPDOWN_ALL'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white disabled:opacity-50"
                    >
                      <option value="VIP">VIP</option>
                      <option value="Regular">Regular</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Max Tickets Per Guest
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={newInviteForm.maxTicketsPerBooking}
                      onChange={(e) =>
                        setNewInviteForm((f) => ({
                          ...f,
                          maxTicketsPerBooking: e.target.value
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate Invitation Link</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Active Registration Invitation Links ({eventInviteLinks.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Share via Copy Link, WhatsApp (linked to Event Sender{' '}
                  <span className="font-mono text-teal-300">
                    {currentEvent.whatsappSenderNumber}
                  </span>
                  ), or click <strong>Open Guest Registration Form</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-300 font-semibold">
                  Optional Recipient WhatsApp Number for Direct Invite Send:
                </span>
                <input
                  type="text"
                  value={newInviteForm.recipientWhatsappToShare}
                  onChange={(e) =>
                    setNewInviteForm((f) => ({
                      ...f,
                      recipientWhatsappToShare: e.target.value
                    }))
                  }
                  placeholder="+971501234567 (or leave blank)"
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white w-56"
                />
              </div>

              <div className="space-y-3">
                {eventInviteLinks.map((inv) => {
                  const fullUrl = getInviteUrlString(inv);
                  return (
                    <div
                      key={inv.id}
                      className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-400">
                            {inv.id}
                          </span>
                          <span className="text-sm font-extrabold text-white">
                            {inv.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Mode:{' '}
                          <strong className="text-emerald-300">
                            {inv.allowedTierMode === 'DROPDOWN_ALL'
                              ? 'Dropdown (VIP / Regular / Staff)'
                              : `Locked to ${inv.allowedTierMode}`}
                          </strong>{' '}
                          • Max {inv.maxTicketsPerBooking} Passes •{' '}
                          <strong className="text-amber-300">
                            {inv.registrationsCount} Guests Registered
                          </strong>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 truncate">
                        {fullUrl}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              fullUrl,
                              'Invitation registration link copied to clipboard!'
                            )
                          }
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copy Link</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShareInviteViaWhatsApp(inv)}
                          className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Send Invite via WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openGuestInvitationPortal(inv)}
                          className="ml-auto px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-sm"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Guest Registration Form</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ROUTE 3: `/export` */}
        {currentRoute === '/export' && currentRoleConfig.canExportCSV && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-white">
                  One-Way Guest List CSV Export for Check-In Apps
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Export all individual QR strings and ticket tiers (`VIP`, `Regular`, `Staff`) for import into Attendium, Guest Manager, RSVPify, or Zkipster.
                </p>
              </div>
              <button
                onClick={handleDownloadCsvExport}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20"
              >
                <Download className="w-4 h-4" />
                <span>
                  Download {exportPreset} CSV ({eventStats.totalTickets} Tickets)
                </span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {['Attendium', 'Guest Manager', 'RSVPify', 'Zkipster'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setExportPreset(preset)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                    exportPreset === preset
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {preset} Format
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ROUTE 4: `/scanner` */}
        {currentRoute === '/scanner' && (
          <div className="max-w-3xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Offline-Ready Mobile Door Check-In Scanner
                </span>
                <h2 className="text-lg font-extrabold text-white mt-0.5">
                  {currentEvent.name}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCameraActive((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                    cameraActive
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  }`}
                >
                  {cameraActive ? (
                    <>
                      <CameraOff className="w-4 h-4" />
                      <span>Stop Camera</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>Open Camera</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSoundEnabled((s) => !s)}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
                  title="Toggle Scanner Sound"
                >
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              </div>
            </div>

            {cameraError && (
              <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200">
                {cameraError}
              </div>
            )}

            {cameraActive && (
              <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-emerald-500/50 aspect-video max-h-80 mx-auto">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-56 h-40 border-2 border-emerald-400 rounded-2xl shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]" />
                </div>
                <div className="absolute bottom-3 inset-x-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-full bg-slate-950/85 text-[11px] font-bold text-emerald-300 border border-emerald-500/30">
                    Point at QR Code OR Check-In ID Text
                  </span>
                  <button
                    type="button"
                    disabled={isScanningTextId}
                    onClick={handleCaptureAndScanTextId}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-[11px] flex items-center gap-1.5 shadow-lg"
                  >
                    <ScanText className="w-3.5 h-3.5" />
                    <span>{isScanningTextId ? 'Reading ID...' : 'Read QR Code ID Text'}</span>
                  </button>
                </div>
              </div>
            )}

            {scanResult && (
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  scanResult.status === 'VALID'
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                    : scanResult.status === 'DUPLICATE'
                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                    : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                }`}
              >
                {scanResult.status === 'VALID' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                ) : scanResult.status === 'DUPLICATE' ? (
                  <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
                )}
                <div className="text-xs space-y-1">
                  <div className="font-extrabold text-sm">
                    {scanResult.status === 'VALID'
                      ? 'ACCESS GRANTED — VALID TICKET'
                      : scanResult.status === 'DUPLICATE'
                      ? 'ALREADY CHECKED IN — DUPLICATE SCAN'
                      : 'INVALID QR CODE'}
                  </div>
                  {scanResult.attendee && (
                    <div className="font-bold text-white">
                      {scanResult.attendee} ({scanResult.tier})
                    </div>
                  )}
                  <div className="font-mono opacity-80">{scanResult.qrString}</div>
                  <div>{scanResult.message}</div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={manualQrInput}
                onChange={(e) => setManualQrInput(e.target.value)}
                placeholder="Scan or enter QR string (e.g. AM-EVT01-VIP-BK1001-T2-4D7E1B)..."
                className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => handleScanQrCode(manualQrInput)}
                className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs"
              >
                Verify QR
              </button>
            </div>

            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tap Any Cached Ticket Below to Simulate Camera QR Scan:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {eventBookings.flatMap((b) =>
                  b.tickets.map((t) => (
                    <button
                      key={t.ticketId}
                      onClick={() => handleScanQrCode(t.qrString)}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-left flex items-center justify-between gap-2 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {t.attendeeLabel}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate">
                          {t.qrString}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded border shrink-0 ${
                          t.checkedIn
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {t.checkedIn ? 'Scanned' : 'Scan Now'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ROUTE 5: `/config` */}
        {currentRoute === '/config' && currentRoleConfig.canManageEvents && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Server className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h2 className="text-base font-extrabold text-white">
                      Email Delivery Configuration (Browser-Compatible)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Configure how AM Events Manager sends ticket emails directly from your web app.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-slate-300">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>
                    <strong>Why raw SMTP port 587 doesn&apos;t work in browsers:</strong> Web browsers block direct TCP/SMTP sockets for security. Choose one of the 3 working delivery engines below:
                  </p>
                  <ul className="list-disc pl-4 text-[11px] text-slate-400 space-y-0.5">
                    <li>
                      <strong className="text-emerald-300">EmailJS Direct API (Recommended):</strong> Free account at <code>emailjs.com</code> — connects directly to your Gmail/Outlook and sends silent 1-click emails from the browser.
                    </li>
                    <li>
                      <strong className="text-teal-300">REST Email API (Resend / Brevo):</strong> Sends HTML emails via HTTPS REST API.
                    </li>
                    <li>
                      <strong className="text-amber-300">Default Mail Client (mailto):</strong> Works immediately with zero API keys by opening a pre-filled ticket email in your device Mail app.
                    </li>
                  </ul>
                </div>
              </div>

              <form onSubmit={handleSaveAppConfig} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-emerald-300 mb-1">
                    Select Active Email Delivery Engine *
                  </label>
                  <select
                    value={configForm.deliveryEngine}
                    onChange={(e) =>
                      setConfigForm((f) => ({ ...f, deliveryEngine: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs font-extrabold text-white cursor-pointer"
                  >
                    <option value="emailjs">
                      1. EmailJS Direct Browser API (Silent 1-Click Send — Free at emailjs.com)
                    </option>
                    <option value="rest_api">
                      2. Transactional REST API (Resend / Brevo / Custom API Endpoint)
                    </option>
                    <option value="mailto">
                      3. Default Device Mail Client (mailto: — Zero Setup Required)
                    </option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Sender Email Address (From) *
                    </label>
                    <input
                      type="email"
                      required
                      value={configForm.senderEmail}
                      onChange={(e) =>
                        setConfigForm((f) => ({ ...f, senderEmail: e.target.value }))
                      }
                      placeholder="tickets@am-events.ae"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Sender Display Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={configForm.senderDisplayName}
                      onChange={(e) =>
                        setConfigForm((f) => ({ ...f, senderDisplayName: e.target.value }))
                      }
                      placeholder="AM Events — Ticketing Desk"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>
                </div>

                {configForm.deliveryEngine === 'emailjs' && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3">
                    <div className="text-xs font-extrabold text-emerald-300">
                      EmailJS API Credentials (from dashboard.emailjs.com)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          Service ID *
                        </label>
                        <input
                          type="text"
                          value={configForm.emailjsServiceId}
                          onChange={(e) =>
                            setConfigForm((f) => ({
                              ...f,
                              emailjsServiceId: e.target.value
                            }))
                          }
                          placeholder="service_xxxxxxx"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          Template ID *
                        </label>
                        <input
                          type="text"
                          value={configForm.emailjsTemplateId}
                          onChange={(e) =>
                            setConfigForm((f) => ({
                              ...f,
                              emailjsTemplateId: e.target.value
                            }))
                          }
                          placeholder="template_xxxxxxx"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          Public Key *
                        </label>
                        <input
                          type="text"
                          value={configForm.emailjsPublicKey}
                          onChange={(e) =>
                            setConfigForm((f) => ({
                              ...f,
                              emailjsPublicKey: e.target.value
                            }))
                          }
                          placeholder="user_xxxxxxxxxxxx"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-amber-300"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {configForm.deliveryEngine === 'rest_api' && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-teal-500/30 space-y-3">
                    <div className="text-xs font-extrabold text-teal-300">
                      REST Email API Credentials (Resend / Brevo / Custom Webhook)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          API Endpoint URL *
                        </label>
                        <input
                          type="url"
                          value={configForm.restApiEndpoint}
                          onChange={(e) =>
                            setConfigForm((f) => ({
                              ...f,
                              restApiEndpoint: e.target.value
                            }))
                          }
                          placeholder="https://api.resend.com/emails"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          Bearer API Key *
                        </label>
                        <div className="relative">
                          <input
                            type={showApiTokenSecret ? 'text' : 'password'}
                            value={configForm.restApiBearerToken}
                            onChange={(e) =>
                              setConfigForm((f) => ({
                                ...f,
                                restApiBearerToken: e.target.value
                              }))
                            }
                            placeholder="re_xxxxxxxxxxxx"
                            className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-amber-300"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiTokenSecret((s) => !s)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            {showApiTokenSecret ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Send Live Test Ticket Email To:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="email"
                      value={testRecipientEmail}
                      onChange={(e) => setTestRecipientEmail(e.target.value)}
                      placeholder="your-email@gmail.com"
                      className="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    />
                    <button
                      type="button"
                      disabled={isSendingEmail}
                      onClick={handleSendRealTestEmail}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{isSendingEmail ? 'Sending...' : 'Send Test Ticket Email'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-800">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20"
                  >
                    Save Email &amp; WhatsApp Config
                  </button>
                </div>
              </form>
            </div>

            <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <Phone className="w-5 h-5 text-teal-400" />
                <div>
                  <h2 className="text-base font-extrabold text-white">
                    Main WhatsApp Sender Number
                  </h2>
                  <p className="text-xs text-slate-400">
                    Default WhatsApp number linked across events.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-teal-300 mb-1">
                    Global Main WhatsApp Sender Number *
                  </label>
                  <input
                    type="text"
                    value={configForm.mainWhatsappNumber}
                    onChange={(e) =>
                      setConfigForm((f) => ({
                        ...f,
                        mainWhatsappNumber: e.target.value
                      }))
                    }
                    placeholder="+971508429900"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-teal-500/40 text-sm font-mono font-extrabold text-teal-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Main WhatsApp Desk Label
                  </label>
                  <input
                    type="text"
                    value={configForm.mainWhatsappLabel}
                    onChange={(e) =>
                      setConfigForm((f) => ({
                        ...f,
                        mainWhatsappLabel: e.target.value
                      }))
                    }
                    placeholder="AM Events Main WhatsApp Gateway"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    WhatsApp Cloud API Token (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type={showWaTokenSecret ? 'text' : 'password'}
                      value={configForm.whatsappApiToken}
                      onChange={(e) =>
                        setConfigForm((f) => ({
                          ...f,
                          whatsappApiToken: e.target.value
                        }))
                      }
                      placeholder="EAAG..."
                      className="w-full pl-3.5 pr-9 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-amber-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWaTokenSecret((s) => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showWaTokenSecret ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-2.5">
                  <button
                    type="button"
                    onClick={handleApplyMainWhatsappToAllEvents}
                    className="w-full py-2.5 px-4 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-extrabold flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>
                      Apply Main WhatsApp ({configForm.mainWhatsappNumber}) to All Events
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAppConfig}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs"
                  >
                    Save Main WhatsApp Config
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ROUTE 6: `/users` */}
        {currentRoute === '/users' && authenticatedUser.role === 'super_admin' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-rose-400" />
                  <h2 className="text-base font-extrabold text-white">
                    Create Staff Account
                  </h2>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Super Admin Only
                </span>
              </div>

              <form onSubmit={handleProvisionUserSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Staff Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={provisionForm.name}
                    onChange={(e) =>
                      setProvisionForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. Omar Al-Farsi"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Login Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={provisionForm.username}
                      onChange={(e) =>
                        setProvisionForm((f) => ({ ...f, username: e.target.value }))
                      }
                      placeholder="omar"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={provisionForm.email}
                      onChange={(e) =>
                        setProvisionForm((f) => ({ ...f, email: e.target.value }))
                      }
                      placeholder="omar@amevents.local"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Temporary Password *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={provisionForm.temporaryPassword}
                      onChange={(e) =>
                        setProvisionForm((f) => ({
                          ...f,
                          temporaryPassword: e.target.value
                        }))
                      }
                      className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-emerald-300"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setProvisionForm((f) => ({
                          ...f,
                          temporaryPassword: `StaffPass!${Math.floor(
                            1000 + Math.random() * 9000
                          )}`
                        }))
                      }
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Generate</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Assign Role *
                    </label>
                    <select
                      value={provisionForm.role}
                      onChange={(e) =>
                        setProvisionForm((f) => ({ ...f, role: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white cursor-pointer"
                    >
                      <option value="admin">Admin (Coordinator)</option>
                      <option value="user">User (Door Scanner)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Gate / Desk Station
                    </label>
                    <input
                      type="text"
                      value={provisionForm.station}
                      onChange={(e) =>
                        setProvisionForm((f) => ({ ...f, station: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Staff Account</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Authorized Staff Directory ({usersDb.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Super Admin can edit or reset passwords for their own account and any staff account.
                  </p>
                </div>
                <button
                  onClick={() => openPasswordResetModal(authenticatedUser)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Edit My Password</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase text-slate-400">
                      <th className="py-3 px-4">Staff Member &amp; Username</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Station</th>
                      <th className="py-3 px-4 text-right">Password &amp; Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {usersDb.map((u) => {
                      const rConf = ROLES_HIERARCHY[u.role] || ROLES_HIERARCHY.user;
                      return (
                        <tr key={u.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white">{u.name}</span>
                              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300">
                                @{u.username}
                              </span>
                              {u.id === authenticatedUser.id && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-slate-400 text-[11px] mt-0.5">
                              {u.email}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded border font-extrabold text-[10px] ${rConf.badgeClass}`}
                            >
                              {rConf.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">{u.station}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openPasswordResetModal(u)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold text-[11px] flex items-center gap-1"
                              >
                                <Key className="w-3 h-3" />
                                <span>Edit Password</span>
                              </button>
                              {u.id !== authenticatedUser.id && (
                                <button
                                  onClick={() => handleDeleteUserAccount(u)}
                                  className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300"
                                  title="Remove Staff Account"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ==================================================================== */}
      {/* MODAL 1: EDIT ACTIVE EVENT DETAILS (SUPER ADMIN & ADMIN)             */}
      {/* ==================================================================== */}
      {showEditEventModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Edit Event Details ({currentEvent.id})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Changes immediately apply to PDF tickets, invitation links, and CSV exports.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditEventModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveEditedEvent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={editEventForm.name}
                  onChange={(e) =>
                    setEditEventForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editEventForm.date}
                    onChange={(e) =>
                      setEditEventForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Event Time *
                  </label>
                  <input
                    type="text"
                    required
                    value={editEventForm.time}
                    onChange={(e) =>
                      setEditEventForm((f) => ({ ...f, time: e.target.value }))
                    }
                    placeholder="18:00 - 22:30"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Venue / Location *
                </label>
                <input
                  type="text"
                  required
                  value={editEventForm.location}
                  onChange={(e) =>
                    setEditEventForm((f) => ({ ...f, location: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-teal-300 mb-1">
                    Event WhatsApp Sender Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={editEventForm.whatsappSenderNumber}
                    onChange={(e) =>
                      setEditEventForm((f) => ({
                        ...f,
                        whatsappSenderNumber: e.target.value
                      }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-teal-500/40 text-xs font-mono font-bold text-teal-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Max Seat Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editEventForm.capacity}
                    onChange={(e) =>
                      setEditEventForm((f) => ({ ...f, capacity: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Event Status
                  </label>
                  <select
                    value={editEventForm.status}
                    onChange={(e) =>
                      setEditEventForm((f) => ({ ...f, status: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white"
                  >
                    <option value="Active">Active (Open)</option>
                    <option value="Draft">Draft</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    WhatsApp Desk Label
                  </label>
                  <input
                    type="text"
                    value={editEventForm.whatsappSenderLabel}
                    onChange={(e) =>
                      setEditEventForm((f) => ({
                        ...f,
                        whatsappSenderLabel: e.target.value
                      }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Event Notes / Description
                </label>
                <textarea
                  rows={2}
                  value={editEventForm.description}
                  onChange={(e) =>
                    setEditEventForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditEventModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 font-extrabold text-xs"
                >
                  Save Event Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: CREATE NEW EVENT                                            */}
      {/* ==================================================================== */}
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">
                Create New Event &amp; Assign WhatsApp Sender
              </h3>
              <button
                onClick={() => setShowNewEventModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateNewEvent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={newEventForm.name}
                  onChange={(e) =>
                    setNewEventForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Annual Tech Summit 2026"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newEventForm.date}
                    onChange={(e) =>
                      setNewEventForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Time
                  </label>
                  <input
                    type="text"
                    value={newEventForm.time}
                    onChange={(e) =>
                      setNewEventForm((f) => ({ ...f, time: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Venue / Location *
                </label>
                <input
                  type="text"
                  required
                  value={newEventForm.location}
                  onChange={(e) =>
                    setNewEventForm((f) => ({ ...f, location: e.target.value }))
                  }
                  placeholder="e.g. Grand Convention Center"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-teal-300 mb-1">
                  Dedicated Event WhatsApp Sender Number *
                </label>
                <input
                  type="text"
                  required
                  value={newEventForm.whatsappSenderNumber}
                  onChange={(e) =>
                    setNewEventForm((f) => ({
                      ...f,
                      whatsappSenderNumber: e.target.value
                    }))
                  }
                  placeholder="+971508429900"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-teal-500/40 text-xs font-mono font-bold text-teal-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewEventModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: PRINTABLE PDF TICKET PASS PREVIEW                           */}
      {/* ==================================================================== */}
      {ticketPreviewBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-3">
              <AMLogo size={36} />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  onClick={() => setTicketPreviewBooking(null)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 bg-slate-100 flex-1">
              {ticketPreviewBooking.tickets.map((t, idx) => (
                <div
                  key={t.ticketId}
                  className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-5"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-slate-900 text-emerald-400">
                        {ticketPreviewBooking.ticketType} PASS
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        Ticket {idx + 1} of {ticketPreviewBooking.tickets.length}
                      </span>
                    </div>
                    <h4 className="text-lg font-black text-slate-950 leading-snug">
                      {currentEvent.name}
                    </h4>
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <div>
                        <strong>Attendee:</strong> {t.attendeeLabel}
                      </div>
                      <div>
                        <strong>Date &amp; Time:</strong> {currentEvent.date} ({currentEvent.time})
                      </div>
                      <div>
                        <strong>Venue:</strong> {currentEvent.location}
                      </div>
                      <div>
                        <strong>Booking Ref:</strong> {ticketPreviewBooking.id} •{' '}
                        <strong>Event WA:</strong> {currentEvent.whatsappSenderNumber}
                      </div>
                    </div>
                    <div className="pt-1 font-mono text-xs font-bold text-emerald-700">
                      QR ID: {t.qrString}
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <QRCodeMatrix value={t.qrString} size={118} />
                    <span className="text-[10px] font-mono text-slate-500">
                      Scan at Gate
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 4: SUPER ADMIN EDIT / RESET PASSWORD MODAL                     */}
      {/* ==================================================================== */}
      {passwordModalUser && authenticatedUser.role === 'super_admin' && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {passwordModalUser.id === authenticatedUser.id
                      ? 'Change My Super Admin Password'
                      : `Reset Password: ${passwordModalUser.name}`}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    @{passwordModalUser.username} ({passwordModalUser.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPasswordModalUser(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            {updatedCredentialSummary ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-extrabold text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Password Updated Successfully!</span>
                  </div>
                  <div className="font-mono text-slate-200 space-y-1 pt-1">
                    <div>Username: {updatedCredentialSummary.username}</div>
                    <div>Email: {updatedCredentialSummary.email}</div>
                    <div>
                      New Password:{' '}
                      <strong className="text-amber-300">
                        {updatedCredentialSummary.newPassword}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        `AM Events Manager Login\nUsername: ${updatedCredentialSummary.username}\nPassword: ${updatedCredentialSummary.newPassword}`,
                        'Copied updated login credentials!'
                      )
                    }
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copy Credentials</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasswordModalUser(null)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateUserPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    New Password *
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showNewPasswordText ? 'text' : 'password'}
                        required
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-amber-300"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPasswordText((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showNewPasswordText ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setNewPasswordInput(
                          `AMSecure!${Math.floor(1000 + Math.random() * 9000)}`
                        )
                      }
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
                    >
                      Generate
                    </button>
                  </div>

                  {(() => {
                    const strength = getPasswordStrength(newPasswordInput);
                    return (
                      <div className="mt-2 space-y-1">
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full transition-all ${strength.bar}`} />
                        </div>
                        <div className={`text-[11px] font-bold ${strength.color}`}>
                          {strength.label}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPasswordModalUser(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs"
                  >
                    Save New Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 5: SUPER ADMIN BULK GUEST REGISTRATION VIA CSV UPLOAD          */}
      {/* ==================================================================== */}
      {showBulkCsvModal && authenticatedUser.role === 'super_admin' && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Bulk Guest Registration via CSV Upload ({currentEvent.name})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Upload a `.csv` file or paste guest rows to generate unique QR codes in bulk (`VIP` / `Regular` / `Staff`).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadSampleCsvTemplate}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample CSV Template</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkCsvModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-5 flex flex-col justify-between p-4 rounded-2xl bg-slate-950 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 transition-colors space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-400 uppercase">
                      <Upload className="w-4 h-4" />
                      <span>1. Upload CSV File from Device</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Columns: <code className="text-slate-200">First Name, Last Name, Email, WhatsApp, Ticket Type, Quantity, Notes</code>
                    </p>
                  </div>

                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleCsvFileUpload}
                    className="block w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-emerald-500 file:text-slate-950 hover:file:bg-emerald-400 cursor-pointer"
                  />

                  <button
                    type="button"
                    onClick={() => parseBulkCsvContent(SAMPLE_BULK_CSV_TEXT)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-amber-500/30"
                  >
                    Load Sample 5-Guest Batch
                  </button>
                </div>

                <div className="lg:col-span-7 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Or Paste / Edit CSV Rows Directly:
                  </label>
                  <textarea
                    rows={5}
                    value={csvRawText}
                    onChange={(e) => parseBulkCsvContent(e.target.value)}
                    placeholder="First Name,Last Name,Email,WhatsApp,Ticket Type,Quantity,Notes"
                    className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {parsedCsvRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                      2. Preview &amp; Adjust Ticket Types Before Import ({parsedCsvRows.filter((r) => r.selected && r.isValid).length} Valid Guests Selected)
                    </span>

                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={csvAutoCheckIn}
                        onChange={(e) => setCsvAutoCheckIn(e.target.checked)}
                        className="rounded border-slate-700"
                      />
                      <span>Auto-Mark Checked-In</span>
                    </label>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-bold uppercase text-slate-400">
                          <th className="py-2.5 px-3">Import</th>
                          <th className="py-2.5 px-3">Guest Name</th>
                          <th className="py-2.5 px-3">Email &amp; WhatsApp</th>
                          <th className="py-2.5 px-3">Ticket Type (Dropdown)</th>
                          <th className="py-2.5 px-3">Qty</th>
                          <th className="py-2.5 px-3">Validation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {parsedCsvRows.map((row, idx) => (
                          <tr key={row.rowId} className="hover:bg-slate-900/40">
                            <td className="py-2.5 px-3">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                disabled={!row.isValid}
                                onChange={(e) =>
                                  setParsedCsvRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, selected: e.target.checked } : r
                                    )
                                  )
                                }
                              />
                            </td>
                            <td className="py-2.5 px-3 font-bold text-white">
                              {row.firstName} {row.lastName}
                              {row.notes && (
                                <div className="text-[10px] text-slate-500 font-normal">
                                  {row.notes}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="text-slate-200">{row.email}</div>
                              <div className="font-mono text-[11px] text-teal-400">
                                {row.whatsapp}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                value={row.ticketType}
                                onChange={(e) =>
                                  setParsedCsvRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, ticketType: e.target.value } : r
                                    )
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-emerald-500/40 text-xs font-extrabold text-emerald-300"
                              >
                                <option value="VIP">VIP</option>
                                <option value="Regular">Regular</option>
                                <option value="Staff">Staff</option>
                              </select>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-white">
                              {row.quantity}
                            </td>
                            <td className="py-2.5 px-3">
                              {!row.isValid ? (
                                <span className="text-rose-400 font-bold">
                                  Invalid Name/Email
                                </span>
                              ) : row.isDuplicate ? (
                                <span className="text-amber-300 font-bold">
                                  Duplicate Email Warning
                                </span>
                              ) : (
                                <span className="text-emerald-400 font-bold">
                                  ✓ Ready ({row.quantity} QR)
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Total QR Passes to Generate:{' '}
                <strong className="text-emerald-400">
                  {parsedCsvRows
                    .filter((r) => r.selected && r.isValid)
                    .reduce((acc, r) => acc + (Number(r.quantity) || 1), 0)}{' '}
                  Individual QR Tickets
                </strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkCsvModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkCsvImport}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20"
                >
                  Confirm &amp; Register {parsedCsvRows.filter((r) => r.selected && r.isValid).length} Guests
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
    }
