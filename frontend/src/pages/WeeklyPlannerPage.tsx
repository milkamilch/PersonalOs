import { useState } from 'react'
import { Download, ChevronRight, RefreshCw, Plus, X } from 'lucide-react'
import PageHeader from '../components/PageHeader'

// ── Types ──────────────────────────────────────────────────────────────────

type EventType = 'sleep' | 'routine' | 'food' | 'run' | 'strength' | 'recovery_sport' |
  'uni' | 'coding' | 'reading' | 'free' | 'recovery' | 'appointment' | 'travel' | 'haushalt'

interface FixedAppointment {
  id: string
  dayIndex: number
  title: string
  startMin: number
  durationMin: number
  travelMin: number   // one-way travel time; 0 = no travel
}

interface PlanEvent {
  title: string
  emoji: string
  start: number
  end: number
  type: EventType
  desc: string
  conflict?: boolean
}

interface DayPlan {
  dayIndex: number
  date: Date
  events: PlanEvent[]
}

interface PlanConfig {
  weekStart: Date
  phase: 1 | 2 | 3
  phaseWeek: 1 | 2 | 3 | 4
  wakeMin: number
  routineMin: number
  programmingMin: number
  readingMin: number
  uniStart: number
  uniEnd: number
  travelUniMin: number    // one-way travel time to uni (minutes)
  travelGymMin: number    // one-way travel time to gym (minutes)
  haushaltMin: number     // 0 = disabled
  haushaltDay: number     // 0=Mon … 6=Sun
  haushaltStart: number   // minutes from midnight
  bedMin: number
}

// ── Training data ──────────────────────────────────────────────────────────

interface TrainSession {
  title: string
  emoji: string
  dur: number
  desc: string
  type: 'run' | 'strength' | 'recovery_sport'
  fixedStart?: number
}

const P1: Array<{ morning?: TrainSession; afternoon?: TrainSession; evening?: TrainSession }> = [
  { // Mon
    morning: { title: 'Lauf – Intervall-Grundlage', emoji: '🏃', dur: 80, type: 'run',
      desc: '2km einlaufen · 10×400m @85% Pace (75s Pause) · 2km auslaufen · ~10km gesamt' },
    evening: { title: 'Kraft – Oberkörper Supersätze', emoji: '💪', dur: 75, type: 'strength',
      desc: 'Supersatz A 5×: Liegestütze max + Klimmzüge max · Supersatz B 4×: Dips + Schulterdrücken · 100 Liegestütze Finisher · Core 4×' },
  },
  { // Tue
    morning: { title: 'Lauf – Intervalle + Sprint', emoji: '🏃', dur: 75, type: 'run',
      desc: '2km einlaufen · 8×400m @88% · 6×50m Sprints VOLLGAS · 2km auslaufen' },
    evening: { title: 'Koordination & Kraft – Explosiv', emoji: '💥', dur: 75, type: 'strength',
      desc: 'Wechselsprünge 5×40s · 6×200m @90% · Plyometrie 4×10 · 3 Runden: Liegestütze+Klimmzüge+Kniebeugen · Rucksack 6kg: 4×200m' },
  },
  { // Wed
    morning: { title: 'Unterkörper – Explosiv & Kraft', emoji: '🦵', dur: 75, type: 'strength',
      desc: 'Wechselsprünge 5×40s · Box Jumps 5×10 · Kniebeugen 6×6 · Romanian Deadlift 5×8 · Bulgarian Split Squats 4×12' },
    evening: { title: 'Testdisziplinen + Gleichgewicht', emoji: '🎯', dur: 60, type: 'strength',
      desc: 'CKCU-Test 6 Durchgänge · 6×200m Sprint-Pace · Rucksack 6kg: 5×200m tragen · Einbeinstand 4×45s' },
  },
  { // Thu
    afternoon: { title: 'Lauf – Schwellenläufe', emoji: '🏃', dur: 75, type: 'run',
      desc: '2km einlaufen · 3×2000m @Laktatschwelle (90s Pause) · 2km auslaufen · ~10km gesamt' },
    evening: { title: 'Kraft – Ganzkörper Komplex', emoji: '💀', dur: 75, type: 'strength',
      desc: 'Kreuzheben 5×5 · Weighted Pull-Ups 5×6 · Supersatz 4×: 20 Liegestütze + 15 Dips · Russian Twists 5×30 · L-Sit 6×20s · 50 Burpees Finisher' },
  },
  { // Fri
    afternoon: { title: '3.000m Testlauf + Kraft-Nachbrenner', emoji: '⏱️', dur: 50, type: 'run',
      desc: '10min Aufwärmen · 3000m VOLLGAS (Ziel Phase 1: <13:00) · 3× [10 Klimmzüge + 20 Liegestütze] direkt danach' },
    evening: { title: 'Testdisziplinen + Kondition', emoji: '🎯', dur: 60, type: 'strength',
      desc: 'CKCU-Test 8 Durchgänge · 8×200m @90% Pace · Rucksack 6kg: 6×200m · Einbeinstand 5×45s' },
  },
  { // Sat
    morning: { title: 'MEGA-SESSION – Feuerwehr-Simulation', emoji: '💀', dur: 120, type: 'run',
      desc: '8km Einlaufen · 6 Runden (10 Klimmzüge + 20 Liegestütze + 30 Kniebeugen + 30s Wechselsprünge + 400m Sprint) · 2km Cool-Down · GESAMTZEIT STOPPEN' },
    afternoon: { title: 'Koordination & Härte', emoji: '🔥', dur: 90, type: 'strength', fixedStart: 15 * 60,
      desc: '6×400m @85% (60s Pause) · Seitwärts-Shuffles 6×1min · Einbeinstand 5×45s · Rucksack 6kg: 3×400m · Kältebad + Foam Rolling 25min' },
  },
  { // Sun
    morning: { title: 'Aktive Regeneration', emoji: '🌿', dur: 40, type: 'recovery_sport',
      desc: '40min lockeres Schwimmen oder Spazieren – kein intensiver Sport' },
    afternoon: { title: 'Foam Rolling & Stretching', emoji: '🧘', dur: 45, type: 'recovery_sport', fixedStart: 11 * 60,
      desc: 'Foam Rolling 25min (Beine, Rücken, Schultern) · Stretching 20min – tief und langsam · Ziel: 9h Schlaf' },
  },
]

const TRAINING_BY_PHASE: Record<number, typeof P1> = { 1: P1, 2: P1, 3: P1 }

// ── Schedule generation ────────────────────────────────────────────────────

const UNI_DAYS = new Set([3, 4])

function addTraining(
  ev: (e: PlanEvent) => void,
  cursor: number,
  session: TrainSession,
  travelGymMin: number,
  fixedStart?: number,
): number {
  let c = fixedStart ?? cursor
  if (travelGymMin > 0) {
    ev({ title: 'Weg zum Training', emoji: '🚶', start: c, end: c + travelGymMin, type: 'travel',
      desc: `${travelGymMin}min Anfahrt` })
    c += travelGymMin
  }
  ev({ title: session.title, emoji: session.emoji, start: c, end: c + session.dur, type: session.type, desc: session.desc })
  c += session.dur
  const recoveryDur = 30 + travelGymMin
  ev({ title: travelGymMin > 0 ? 'Dusche & Weg nach Hause' : 'Recovery & Dusche', emoji: '🚿',
    start: c, end: c + recoveryDur, type: 'recovery',
    desc: travelGymMin > 0 ? `Duschen · dehnen · ${travelGymMin}min Heimweg` : 'Kaltdusche · dehnen · Protein-Shake' })
  c += recoveryDur
  return c
}

function generatePlan(cfg: PlanConfig, fixedAppts: FixedAppointment[] = []): DayPlan[] {
  const training = TRAINING_BY_PHASE[cfg.phase] ?? P1
  const days: DayPlan[] = []

  for (let d = 0; d < 7; d++) {
    const date = new Date(cfg.weekStart)
    date.setDate(date.getDate() + d)
    const events: PlanEvent[] = []
    const day = training[d]
    const isUni = UNI_DAYS.has(d)
    const isSunday = d === 6

    const ev = (e: PlanEvent) => events.push(e)
    const T = (start: number, dur: number) => ({ start, end: start + dur })

    ev({ title: 'Schlafen', emoji: '😴', ...T(0, cfg.wakeMin), type: 'sleep',
      desc: `${Math.round(cfg.wakeMin / 60)}h Schlaf` })

    const routineEnd = cfg.wakeMin + cfg.routineMin
    ev({ title: isSunday ? 'Ausschlafen & Morgenroutine' : 'Morgenroutine & Frühstück', emoji: '☀️',
      ...T(cfg.wakeMin, cfg.routineMin), type: 'routine',
      desc: 'Aufstehen · Hygiene · Frühstück · kurz ankommen' })

    let cursor = routineEnd

    // ── Haushalt block ──────────────────────────────────────────────────────
    if (cfg.haushaltMin > 0 && d === cfg.haushaltDay) {
      ev({ title: 'Haushalt & Aufräumen', emoji: '🏠',
        start: cfg.haushaltStart, end: cfg.haushaltStart + cfg.haushaltMin,
        type: 'haushalt', desc: 'Aufräumen · Putzen · Wäsche · Einkaufen' })
    }

    if (isSunday) {
      const morTrain = day.morning
      if (morTrain) {
        cursor = addTraining(ev, cursor, morTrain, cfg.travelGymMin)
      }
      const readStart = Math.min(12 * 60, cfg.bedMin - cfg.readingMin - 120)
      ev({ title: 'Freie Zeit & Erholung', emoji: '🎯', ...T(cursor, readStart - cursor), type: 'free',
        desc: 'Entspannen · Freunde / Familie · keine Pflichten' })
      ev({ title: 'Lesen', emoji: '📚', ...T(readStart, cfg.readingMin), type: 'reading',
        desc: `${cfg.readingMin}min Lesen – ruhige Stimmung, kein Bildschirm danach` })
      const aftTrain = day.afternoon
      if (aftTrain) {
        const s = aftTrain.fixedStart ?? 11 * 60
        addTraining(ev, s, aftTrain, cfg.travelGymMin, s)
      }
      ev({ title: 'Wind-down & Abendroutine', emoji: '🌙', ...T(cfg.bedMin - 30, 30), type: 'routine',
        desc: 'Licht dimmen · kein Handy · früh schlafen → 9h Ziel' })

    } else if (isUni) {
      // Travel to uni
      if (cfg.travelUniMin > 0) {
        const deptTime = cfg.uniStart - cfg.travelUniMin
        ev({ title: 'Weg zur Uni', emoji: '🚶', ...T(deptTime, cfg.travelUniMin), type: 'travel',
          desc: `${cfg.travelUniMin}min Anfahrt zur Uni` })
      }
      ev({ title: 'Uni', emoji: '🎓', ...T(cfg.uniStart, cfg.uniEnd - cfg.uniStart), type: 'uni',
        desc: 'Vorlesungen & Übungen' })
      cursor = cfg.uniEnd

      // Travel from uni
      if (cfg.travelUniMin > 0) {
        ev({ title: 'Weg nach Hause', emoji: '🚶', ...T(cursor, cfg.travelUniMin), type: 'travel',
          desc: `${cfg.travelUniMin}min Heimweg von der Uni` })
        cursor += cfg.travelUniMin
      }

      ev({ title: 'Mittagessen & Pause', emoji: '🍽️', ...T(cursor, 60), type: 'food',
        desc: 'Mittagessen – gut essen, Energie tanken' })
      cursor += 60

      const aftTrain = day.afternoon
      if (aftTrain) {
        cursor = addTraining(ev, cursor, aftTrain, cfg.travelGymMin)
      }

      ev({ title: 'Lesen', emoji: '📚', ...T(cursor, cfg.readingMin), type: 'reading',
        desc: `${cfg.readingMin}min Lesen` })
      cursor += cfg.readingMin + 15

      const eveningTrainStart = 18 * 60
      const travelBuffer = cfg.travelGymMin > 0 ? cfg.travelGymMin : 15
      if (cursor < eveningTrainStart - travelBuffer) {
        ev({ title: 'Freie Zeit', emoji: '🎯', ...T(cursor, eveningTrainStart - travelBuffer - cursor), type: 'free',
          desc: 'Entspannen · Spazieren · keine Pflichten' })
      }

      const evTrain = day.evening
      if (evTrain) {
        const afterTrain = eveningTrainStart + cfg.travelGymMin + evTrain.dur + 30 + cfg.travelGymMin
        if (cfg.travelGymMin > 0) {
          ev({ title: 'Weg zum Training', emoji: '🚶', ...T(eveningTrainStart - cfg.travelGymMin, cfg.travelGymMin),
            type: 'travel', desc: `${cfg.travelGymMin}min Anfahrt` })
        }
        ev({ title: evTrain.title, emoji: evTrain.emoji, ...T(eveningTrainStart, evTrain.dur), type: evTrain.type, desc: evTrain.desc })
        const recStart = eveningTrainStart + evTrain.dur
        ev({ title: cfg.travelGymMin > 0 ? 'Dusche & Weg nach Hause' : 'Recovery & Abendessen', emoji: '🍽️',
          ...T(recStart, 45 + cfg.travelGymMin), type: 'food',
          desc: 'Duschen · Abendessen · viel Protein' })
        ev({ title: 'Freie Zeit & Abendroutine', emoji: '🌙', ...T(afterTrain + 15, cfg.bedMin - afterTrain - 15 - 15), type: 'free',
          desc: 'Entspannen · keine harten Bildschirme nach 23:00' })
      } else {
        ev({ title: 'Abend & Wind-down', emoji: '🌙', ...T(eveningTrainStart, cfg.bedMin - eveningTrainStart - 15), type: 'free', desc: '' })
      }
      ev({ title: 'Abendroutine & Schlaf vorbereiten', emoji: '🌙', ...T(cfg.bedMin - 15, 15), type: 'routine',
        desc: 'Zähneputzen · Licht aus' })

    } else if (d === 5) {
      // Saturday
      const morTrain = day.morning!
      const aftTrain = day.afternoon!

      cursor = addTraining(ev, cursor, morTrain, cfg.travelGymMin)

      const progEnd = Math.min(14 * 60, (aftTrain.fixedStart! - cfg.travelGymMin) - 30)
      if (cursor < progEnd - 30 && cfg.programmingMin > 0) {
        const progDur = Math.min(cfg.programmingMin, progEnd - cursor - 30)
        ev({ title: 'Programmieren', emoji: '💻', ...T(cursor, progDur), type: 'coding',
          desc: 'Deep Work · eigene Projekte · PersonalOS' })
        cursor += progDur + 15
      }

      const aftStart = aftTrain.fixedStart!
      if (cfg.travelGymMin > 0) {
        ev({ title: 'Weg zum Training', emoji: '🚶', ...T(aftStart - cfg.travelGymMin, cfg.travelGymMin),
          type: 'travel', desc: `${cfg.travelGymMin}min Anfahrt` })
      }
      ev({ title: aftTrain.title, emoji: aftTrain.emoji, ...T(aftStart, aftTrain.dur), type: aftTrain.type, desc: aftTrain.desc })
      const afterAft = aftStart + aftTrain.dur + cfg.travelGymMin + 45
      ev({ title: cfg.travelGymMin > 0 ? 'Dusche & Weg nach Hause' : 'Abendessen & Erholung', emoji: '🍽️',
        ...T(aftStart + aftTrain.dur, 45 + cfg.travelGymMin), type: 'food',
        desc: 'Viel essen – Kohlenhydrate & Protein · Regeneration beginnt jetzt' })
      ev({ title: 'Freie Zeit & Wochenende', emoji: '🎯', ...T(afterAft, cfg.bedMin - afterAft - 15), type: 'free',
        desc: 'Entspannen · Freunde · Social' })
      ev({ title: 'Schlaf vorbereiten', emoji: '🌙', ...T(cfg.bedMin - 15, 15), type: 'routine', desc: '' })

    } else {
      // Normal weekday (Mon, Tue, Wed)
      const morTrain = day.morning
      if (morTrain) {
        cursor = addTraining(ev, cursor, morTrain, cfg.travelGymMin)
      }

      if (cfg.programmingMin > 0 && cursor < 13 * 60) {
        const progDur = Math.min(cfg.programmingMin, 12 * 60 - cursor)
        ev({ title: 'Programmieren', emoji: '💻', ...T(cursor, progDur), type: 'coding',
          desc: 'Deep Work Block · schwierige Aufgaben in der produktiven Phase angehen' })
        cursor += progDur
      }

      ev({ title: 'Mittagessen', emoji: '🍽️', ...T(12 * 60, 60), type: 'food',
        desc: 'Ausgewogen essen · Kohlenhydrate & Protein für Abendtraining' })
      cursor = 13 * 60

      const remainProg = cfg.programmingMin - Math.max(0, Math.min(cfg.programmingMin, 12 * 60 - routineEnd - (morTrain?.dur ?? 0) - 30 - cfg.travelGymMin * 2))
      if (remainProg > 30 && cursor < 14 * 60) {
        ev({ title: 'Programmieren (Fortsetzung)', emoji: '💻', ...T(cursor, Math.min(remainProg, 60)), type: 'coding', desc: '' })
        cursor += Math.min(remainProg, 60)
      }

      const readStart = Math.max(cursor + 15, 13 * 60 + 30)
      ev({ title: 'Lesen', emoji: '📚', ...T(readStart, cfg.readingMin), type: 'reading',
        desc: `${cfg.readingMin}min konzentriertes Lesen – Handy weglegen` })
      cursor = readStart + cfg.readingMin + 15

      const travelBuffer = cfg.travelGymMin > 0 ? cfg.travelGymMin : 15
      const eveningTrainStart = 18 * 60
      if (cursor < eveningTrainStart - travelBuffer) {
        ev({ title: 'Freie Zeit', emoji: '🎯', ...T(cursor, eveningTrainStart - travelBuffer - cursor), type: 'free',
          desc: 'Spazieren · Nap · Social · Nichts tun ist auch Training' })
      }

      const evTrain = day.evening
      if (evTrain) {
        if (cfg.travelGymMin > 0) {
          ev({ title: 'Weg zum Training', emoji: '🚶', ...T(eveningTrainStart - cfg.travelGymMin, cfg.travelGymMin),
            type: 'travel', desc: `${cfg.travelGymMin}min Anfahrt` })
        }
        ev({ title: evTrain.title, emoji: evTrain.emoji, ...T(eveningTrainStart, evTrain.dur), type: evTrain.type, desc: evTrain.desc })
        const recStart = eveningTrainStart + evTrain.dur
        const recDur = 45 + cfg.travelGymMin
        ev({ title: cfg.travelGymMin > 0 ? 'Abendessen & Weg nach Hause' : 'Abendessen & Regeneration', emoji: '🍽️',
          ...T(recStart, recDur), type: 'food',
          desc: 'Duschen · Abendessen · viel Protein · BCAA/Creatine' })
        const afterTrain = recStart + recDur
        ev({ title: 'Freie Zeit & Abend', emoji: '🌙', ...T(afterTrain, cfg.bedMin - afterTrain - 15), type: 'free',
          desc: 'Entspannen · serien/lesen/nichts tun' })
      }

      ev({ title: 'Schlaf vorbereiten', emoji: '🌙', ...T(cfg.bedMin - 15, 15), type: 'routine',
        desc: 'Zähneputzen · Licht aus · Handy weg' })
    }

    // ── Fixed appointments with travel ──────────────────────────────────────
    for (const appt of fixedAppts.filter(a => a.dayIndex === d)) {
      if (appt.travelMin > 0) {
        ev({ title: `Weg: ${appt.title}`, emoji: '🚶',
          start: appt.startMin - appt.travelMin, end: appt.startMin,
          type: 'travel', desc: `${appt.travelMin}min Anfahrt` })
      }
      ev({ title: appt.title, emoji: '📅',
        start: appt.startMin, end: appt.startMin + appt.durationMin,
        type: 'appointment',
        desc: appt.travelMin > 0
          ? `Fester Termin · inkl. ${appt.travelMin}min Wegzeit je Richtung`
          : 'Fester Termin' })
      if (appt.travelMin > 0) {
        const retStart = appt.startMin + appt.durationMin
        ev({ title: 'Rückweg', emoji: '🚶',
          start: retStart, end: retStart + appt.travelMin,
          type: 'travel', desc: `${appt.travelMin}min Heimweg` })
      }
    }

    events.sort((a, b) => a.start - b.start)

    // Mark overlapping events
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        if (events[j].start < events[i].end) {
          events[i].conflict = true
          events[j].conflict = true
        } else {
          break // sorted, no need to check further
        }
      }
    }

    days.push({ dayIndex: d, date, events })
  }

  return days
}

// ── ICS export ─────────────────────────────────────────────────────────────

function fmtICS(date: Date, minutesFromMidnight: number): string {
  const d = new Date(date)
  let mins = minutesFromMidnight
  if (mins >= 24 * 60) { d.setDate(d.getDate() + 1); mins -= 24 * 60 }
  const Y = d.getFullYear()
  const M = String(d.getMonth() + 1).padStart(2, '0')
  const D = String(d.getDate()).padStart(2, '0')
  const HH = String(Math.floor(mins / 60)).padStart(2, '0')
  const MM = String(mins % 60).padStart(2, '0')
  return `${Y}${M}${D}T${HH}${MM}00`
}

function exportICS(days: DayPlan[], cfg: PlanConfig) {
  const lines: string[] = [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'PRODID:-//PersonalOS//WeeklyPlanner//DE',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:PersonalOS Wochenplan',
    'X-WR-TIMEZONE:Europe/Berlin',
  ]
  for (const day of days) {
    for (const ev of day.events) {
      if (ev.type === 'sleep' || ev.type === 'free') continue
      const uid = `${day.date.toISOString().slice(0, 10)}-${ev.start}-${Math.random().toString(36).slice(2)}@personalos`
      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART:${fmtICS(day.date, ev.start)}`,
        `DTEND:${fmtICS(day.date, ev.end)}`,
        `SUMMARY:${ev.emoji} ${ev.title}`,
        `DESCRIPTION:${ev.desc.replace(/\n/g, '\\n')}`,
        `CATEGORIES:${ev.type.toUpperCase()}`,
        'END:VEVENT',
      )
    }
  }
  lines.push('END:VCALENDAR')
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const dateStr = cfg.weekStart.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  a.download = `PersonalOS_Woche_${dateStr.replace('.', '-')}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toMins(h: number, m: number) { return h * 60 + m }
function minsToTime(m: number): string {
  const hh = Math.floor((m % (24 * 60)) / 60)
  const mm = m % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}
function getThisMonday(): Date {
  const d = new Date()
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}
function getNextMonday(): Date {
  const d = getThisMonday()
  d.setDate(d.getDate() + 7)
  return d
}
function dateToInput(d: Date): string { return d.toISOString().slice(0, 10) }

// ── Color map ──────────────────────────────────────────────────────────────

const TYPE_STYLE: Record<EventType, { bg: string; color: string; border: string }> = {
  sleep:          { bg: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)',   border: 'rgba(255,255,255,0.06)' },
  routine:        { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)',   border: 'rgba(255,255,255,0.1)' },
  food:           { bg: 'rgba(255,214,10,0.08)',  color: 'var(--yellow)',       border: 'rgba(255,214,10,0.2)' },
  run:            { bg: 'rgba(255,69,58,0.1)',    color: '#ff453a',             border: 'rgba(255,69,58,0.3)' },
  strength:       { bg: 'rgba(191,90,242,0.1)',   color: '#bf5af2',             border: 'rgba(191,90,242,0.3)' },
  recovery_sport: { bg: 'rgba(48,209,88,0.08)',   color: 'var(--green)',        border: 'rgba(48,209,88,0.2)' },
  uni:            { bg: 'rgba(10,132,255,0.12)',  color: 'var(--accent)',       border: 'rgba(10,132,255,0.3)' },
  coding:         { bg: 'rgba(48,209,88,0.1)',    color: 'var(--green)',        border: 'rgba(48,209,88,0.25)' },
  reading:        { bg: 'rgba(255,214,10,0.08)',  color: '#ffd60a',             border: 'rgba(255,214,10,0.2)' },
  free:           { bg: 'transparent',            color: 'var(--text-muted)',   border: 'transparent' },
  recovery:       { bg: 'rgba(48,209,88,0.06)',   color: 'var(--text-muted)',   border: 'rgba(48,209,88,0.15)' },
  appointment:    { bg: 'rgba(255,159,10,0.1)',   color: '#ff9f0a',             border: 'rgba(255,159,10,0.3)' },
  travel:         { bg: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)',   border: 'rgba(255,255,255,0.08)' },
  haushalt:       { bg: 'rgba(64,200,224,0.08)',  color: '#40c8e0',             border: 'rgba(64,200,224,0.25)' },
}

const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
const DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

// ── Page ───────────────────────────────────────────────────────────────────

export default function WeeklyPlannerPage() {
  const [step, setStep] = useState<'wizard' | 'plan'>('wizard')
  const [selDay, setSelDay] = useState(0)

  // Woche
  const [weekStart, setWeekStart] = useState(dateToInput(getNextMonday()))
  const [phase, setPhase] = useState<1 | 2 | 3>(1)
  const [phaseWeek, setPhaseWeek] = useState<1 | 2 | 3 | 4>(1)

  // Tagesrhythmus
  const [wakeTime, setWakeTime] = useState('07:15')
  const [routineMin, setRoutineMin] = useState(30)

  // Uni
  const [uniStart, setUniStart] = useState('09:00')
  const [uniEnd, setUniEnd] = useState('13:00')
  const [travelUniMin, setTravelUniMin] = useState(0)

  // Training
  const [travelGymMin, setTravelGymMin] = useState(0)

  // Aktivitäten
  const [progHours, setProgHours] = useState(2)
  const [readingMin, setReadingMin] = useState(60)

  // Haushalt
  const [haushaltMin, setHaushaltMin] = useState(0)
  const [haushaltDay, setHaushaltDay] = useState(5)
  const [haushaltStart, setHaushaltStart] = useState('10:00')

  // Feste Termine
  const [appointments, setAppointments] = useState<FixedAppointment[]>([])
  const [apptDayIdx, setApptDayIdx] = useState(0)
  const [apptTitle, setApptTitle] = useState('')
  const [apptStart, setApptStart] = useState('10:00')
  const [apptDur, setApptDur] = useState(60)
  const [apptTravel, setApptTravel] = useState(0)

  function addAppointment() {
    if (!apptTitle.trim()) return
    const [h, m] = apptStart.split(':').map(Number)
    setAppointments(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      dayIndex: apptDayIdx,
      title: apptTitle.trim(),
      startMin: h * 60 + m,
      durationMin: apptDur,
      travelMin: apptTravel,
    }])
    setApptTitle('')
    setApptTravel(0)
  }

  function buildConfig(): PlanConfig {
    const [wh, wm] = wakeTime.split(':').map(Number)
    const [ush, usm] = uniStart.split(':').map(Number)
    const [ueh, uem] = uniEnd.split(':').map(Number)
    const [hsh, hsm] = haushaltStart.split(':').map(Number)
    return {
      weekStart: new Date(weekStart + 'T00:00:00'),
      phase, phaseWeek,
      wakeMin: toMins(wh, wm),
      routineMin,
      programmingMin: progHours * 60,
      readingMin,
      uniStart: toMins(ush, usm),
      uniEnd: toMins(ueh, uem),
      travelUniMin,
      travelGymMin,
      haushaltMin,
      haushaltDay,
      haushaltStart: toMins(hsh, hsm),
      bedMin: toMins(0, 0) + 24 * 60,
    }
  }

  const [cfg, setCfg] = useState<PlanConfig | null>(null)
  const [plan, setPlan] = useState<DayPlan[]>([])

  function generate() {
    const c = buildConfig()
    setCfg(c)
    setPlan(generatePlan(c, appointments))
    setStep('plan')
    setSelDay(0)
  }

  // ── Wizard UI ──────────────────────────────────────────────────────────

  if (step === 'wizard') {
    return (
      <div className="page-root" style={{ maxWidth: 580 }}>
        <PageHeader title="Wochenplaner" subtitle="Generiere deine perfekte Woche." />

        <div className="space-y-5">

          {/* ── Woche ── */}
          <Section title="Woche">
            <Row label="Start (Montag)">
              <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)}
                     className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
            </Row>
            <Row label="Trainingsphase">
              <div className="flex gap-1">
                {([1, 2, 3] as const).map(p => (
                  <Pill key={p} active={phase === p} onClick={() => setPhase(p)} label={`Phase ${p}`} />
                ))}
              </div>
            </Row>
            <Row label="Woche in Phase">
              <div className="flex gap-1">
                {([1, 2, 3, 4] as const).map(w => (
                  <Pill key={w} active={phaseWeek === w} onClick={() => setPhaseWeek(w)} label={`W${w}`} />
                ))}
              </div>
            </Row>
          </Section>

          {/* ── Feste Termine ── prominent at top */}
          <div className="rounded-2xl overflow-hidden"
               style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,159,10,0.3)' }}>
            <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,159,10,0.2)', background: 'rgba(255,159,10,0.06)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#ff9f0a' }}>
                📅 Feste Termine
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Termine werden inkl. Wegzeit in den Plan eingeplant
              </p>
            </div>
            <div className="p-4 space-y-3">
              {/* Day + Title */}
              <div className="flex gap-2">
                <select value={apptDayIdx} onChange={e => setApptDayIdx(Number(e.target.value))}
                        className="px-3 py-2 rounded-xl text-sm outline-none flex-shrink-0"
                        style={inputStyle}>
                  {DAY_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
                </select>
                <input type="text" placeholder="Titel des Termins" value={apptTitle}
                       onChange={e => setApptTitle(e.target.value)}
                       onKeyDown={e => { if (e.key === 'Enter') addAppointment() }}
                       className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                       style={inputStyle} />
              </div>
              {/* Time + Duration + Travel */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Uhrzeit</label>
                  <input type="time" value={apptStart} onChange={e => setApptStart(e.target.value)}
                         className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Dauer</label>
                  <div className="flex gap-1 flex-wrap">
                    {[30, 60, 90, 120].map(m => (
                      <Pill key={m} active={apptDur === m} onClick={() => setApptDur(m)} label={m >= 60 ? `${m / 60}h` : `${m}min`} />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>
                  Wegzeit (je Richtung)
                </label>
                <div className="flex gap-1 flex-wrap">
                  {[0, 10, 15, 20, 30, 45, 60].map(m => (
                    <Pill key={m} active={apptTravel === m} onClick={() => setApptTravel(m)}
                          label={m === 0 ? 'Keine' : `${m}min`} />
                  ))}
                </div>
              </div>
              <button onClick={addAppointment} disabled={!apptTitle.trim()}
                      className="w-full py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-40"
                      style={{ background: 'rgba(255,159,10,0.15)', color: '#ff9f0a', border: '1px solid rgba(255,159,10,0.3)' }}>
                <Plus size={14} /> Termin hinzufügen
                {apptTravel > 0 && <span className="text-[10px] opacity-70">(+{apptTravel}min Weg je Seite)</span>}
              </button>
              {appointments.length > 0 && (
                <div className="space-y-1.5">
                  {appointments.map(a => (
                    <div key={a.id} className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                         style={{ background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.2)' }}>
                      <span className="text-xs font-semibold w-6 mt-0.5" style={{ color: '#ff9f0a' }}>{DAY_SHORT[a.dayIndex]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{a.title}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {minsToTime(a.startMin)} · {a.durationMin}min
                          {a.travelMin > 0 && ` · 🚶 ${a.travelMin}min Weg je Richtung`}
                        </p>
                      </div>
                      <button onClick={() => setAppointments(prev => prev.filter(x => x.id !== a.id))}
                              className="p-1 rounded transition-all hover:opacity-70 flex-shrink-0">
                        <X size={12} style={{ color: 'var(--text-muted)' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Tagesrhythmus ── */}
          <Section title="Tagesrhythmus">
            <Row label="Aufwachen">
              <input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)}
                     className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
            </Row>
            <Row label="Morgenroutine">
              <div className="flex gap-1">
                {[20, 30, 45, 60].map(m => (
                  <Pill key={m} active={routineMin === m} onClick={() => setRoutineMin(m)} label={`${m}min`} />
                ))}
              </div>
            </Row>
          </Section>

          {/* ── Uni ── */}
          <Section title="Uni (Do + Fr)">
            <Row label="Beginn">
              <input type="time" value={uniStart} onChange={e => setUniStart(e.target.value)}
                     className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
            </Row>
            <Row label="Ende">
              <input type="time" value={uniEnd} onChange={e => setUniEnd(e.target.value)}
                     className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
            </Row>
            <Row label="Wegzeit (je Richtung)">
              <div className="flex gap-1 flex-wrap">
                {[0, 10, 15, 20, 30, 45, 60].map(m => (
                  <Pill key={m} active={travelUniMin === m} onClick={() => setTravelUniMin(m)}
                        label={m === 0 ? 'Keine' : `${m}min`} />
                ))}
              </div>
            </Row>
          </Section>

          {/* ── Training ── */}
          <Section title="Training">
            <Row label="Wegzeit zum Gym (je Richtung)">
              <div className="flex gap-1 flex-wrap">
                {[0, 10, 15, 20, 30, 45].map(m => (
                  <Pill key={m} active={travelGymMin === m} onClick={() => setTravelGymMin(m)}
                        label={m === 0 ? 'Keine' : `${m}min`} />
                ))}
              </div>
            </Row>
          </Section>

          {/* ── Aktivitäten ── */}
          <Section title="Aktivitäten">
            <Row label="Programmieren / Tag">
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map(h => (
                  <Pill key={h} active={progHours === h} onClick={() => setProgHours(h)} label={h === 0 ? 'Keins' : `${h}h`} />
                ))}
              </div>
            </Row>
            <Row label="Lesen / Tag">
              <div className="flex gap-1">
                {[45, 60, 75].map(m => (
                  <Pill key={m} active={readingMin === m} onClick={() => setReadingMin(m)} label={`${m}min`} />
                ))}
              </div>
            </Row>
          </Section>

          {/* ── Haushalt ── */}
          <Section title="Haushalt">
            <Row label="Zeit einplanen">
              <div className="flex gap-1 flex-wrap">
                {[0, 30, 60, 90, 120].map(m => (
                  <Pill key={m} active={haushaltMin === m} onClick={() => setHaushaltMin(m)}
                        label={m === 0 ? 'Keins' : m >= 60 ? `${m / 60}h` : `${m}min`} />
                ))}
              </div>
            </Row>
            {haushaltMin > 0 && (
              <>
                <Row label="Wochentag">
                  <select value={haushaltDay} onChange={e => setHaushaltDay(Number(e.target.value))}
                          className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle}>
                    {DAY_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
                  </select>
                </Row>
                <Row label="Uhrzeit">
                  <input type="time" value={haushaltStart} onChange={e => setHaushaltStart(e.target.value)}
                         className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
                </Row>
              </>
            )}
          </Section>

          <button onClick={generate}
                  className="w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{ background: 'var(--accent)', color: '#000' }}>
            Woche generieren <ChevronRight size={18} />
          </button>
        </div>
      </div>
    )
  }

  // ── Plan UI ──────────────────────────────────────────────────────────────

  const currentDay = plan[selDay]

  return (
    <div className="page-root">
      <PageHeader
        title="Wochenplan"
        subtitle={cfg ? `${cfg.weekStart.toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })} — Phase ${cfg.phase}` : ''}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setStep('wizard')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
              <RefreshCw size={14} /> Neu
            </button>
            <button onClick={() => cfg && exportICS(plan, cfg)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
                    style={{ background: 'var(--accent)', color: '#000' }}>
              <Download size={14} /> .ics Export
            </button>
          </div>
        }
      />

      {/* Day tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {plan.map((day, i) => {
          const hasTraining = day.events.some(e => e.type === 'run' || e.type === 'strength')
          const isUni = day.events.some(e => e.type === 'uni')
          const hasAppt = day.events.some(e => e.type === 'appointment')
          const hasConflict = day.events.some(e => e.conflict)
          return (
            <button key={i} onClick={() => setSelDay(i)}
                    className="flex-shrink-0 flex flex-col items-center py-2.5 px-3 rounded-xl transition-all"
                    style={selDay === i
                      ? { background: hasConflict ? '#ff453a' : 'var(--accent)', color: '#000' }
                      : { background: 'var(--bg-surface)', border: `1px solid ${hasConflict ? 'rgba(255,69,58,0.4)' : 'var(--border-subtle)'}`, color: 'var(--text-muted)' }}>
              <span className="text-[10px] font-semibold">{DAY_SHORT[i]}</span>
              <span className="text-xs mt-0.5">{day.date.getDate()}</span>
              <div className="flex gap-0.5 mt-1">
                {hasConflict && <div className="w-1.5 h-1.5 rounded-full" style={{ background: selDay === i ? '#000' : '#ff453a' }} />}
                {!hasConflict && hasTraining && <div className="w-1.5 h-1.5 rounded-full" style={{ background: selDay === i ? '#000' : '#ff453a' }} />}
                {isUni && <div className="w-1.5 h-1.5 rounded-full" style={{ background: selDay === i ? '#000' : 'var(--accent)' }} />}
                {hasAppt && <div className="w-1.5 h-1.5 rounded-full" style={{ background: selDay === i ? '#000' : '#ff9f0a' }} />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Day detail */}
      {currentDay && (
        <div>
          <p className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            {DAY_NAMES[currentDay.dayIndex]}, {currentDay.date.toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })}
          </p>

          {/* Conflict warning banner */}
          {currentDay.events.some(e => e.conflict) && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-2xl mb-3"
                 style={{ background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.3)' }}>
              <span className="text-base flex-shrink-0">⚠️</span>
              <div>
                <p className="text-xs font-semibold" style={{ color: '#ff453a' }}>Zeitkonflikte erkannt</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Rot markierte Blöcke überschneiden sich. Passe die Zeiten im Wizard an.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            {currentDay.events.map((ev, i) => {
              const style = TYPE_STYLE[ev.type]
              const conflictBorder = ev.conflict ? '2px solid rgba(255,69,58,0.7)' : undefined

              if (ev.type === 'sleep') return (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl opacity-40"
                     style={{ background: style.bg }}>
                  <span className="text-sm w-5 text-center">{ev.emoji}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    00:00 – {minsToTime(ev.end)} · Schlafen
                  </span>
                </div>
              )
              if (ev.type === 'travel') return (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl opacity-60"
                     style={{ background: style.bg, border: conflictBorder ?? `1px solid ${style.border}` }}>
                  <span className="text-sm w-5 text-center">{ev.emoji}</span>
                  <span className="text-xs flex-1" style={{ color: ev.conflict ? '#ff453a' : style.color }}>{ev.title}</span>
                  <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {minsToTime(ev.start % (24 * 60))} – {minsToTime(ev.end % (24 * 60))}
                  </span>
                  {ev.conflict && <span className="text-[10px]" style={{ color: '#ff453a' }}>⚠</span>}
                </div>
              )
              return (
                <div key={i} className="px-4 py-3 rounded-2xl"
                     style={{ background: ev.conflict ? 'rgba(255,69,58,0.06)' : style.bg,
                              border: conflictBorder ?? `1px solid ${style.border}` }}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">{ev.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-semibold"
                              style={{ color: ev.conflict ? '#ff453a' : style.color }}>
                          {ev.title}
                          {ev.conflict && <span className="ml-1 text-[10px]">⚠ Konflikt</span>}
                        </span>
                        <span className="text-[10px] font-medium tabular-nums flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                          {minsToTime(ev.start % (24 * 60))} – {minsToTime(ev.end % (24 * 60))}
                          <span className="ml-1 opacity-60">({ev.end - ev.start}min)</span>
                        </span>
                      </div>
                      {ev.desc && (
                        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          {ev.desc}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Day summary */}
          <div className="mt-6 grid grid-cols-4 gap-2">
            {[
              { label: 'Training', value: `${currentDay.events.filter(e => e.type === 'run' || e.type === 'strength').reduce((s, e) => s + e.end - e.start, 0)}min`, color: '#ff453a' },
              { label: 'Unterwegs', value: `${currentDay.events.filter(e => e.type === 'travel').reduce((s, e) => s + e.end - e.start, 0)}min`, color: 'var(--text-muted)' },
              { label: 'Produktiv', value: `${currentDay.events.filter(e => e.type === 'coding' || e.type === 'reading' || e.type === 'uni').reduce((s, e) => s + e.end - e.start, 0)}min`, color: 'var(--green)' },
              { label: 'Frei', value: `${currentDay.events.filter(e => e.type === 'free').reduce((s, e) => s + e.end - e.start, 0)}min`, color: 'var(--accent)' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-2xl text-center"
                   style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <p className="text-base font-semibold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Week overview */}
      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          Wochenübersicht
        </p>
        <div className="space-y-1.5">
          {plan.map((day, i) => {
            const trainMin = day.events.filter(e => e.type === 'run' || e.type === 'strength').reduce((s, e) => s + e.end - e.start, 0)
            const isUni = day.events.some(e => e.type === 'uni')
            const sessions = day.events.filter(e => e.type === 'run' || e.type === 'strength')
            const appts = day.events.filter(e => e.type === 'appointment')
            const hasHaushalt = day.events.some(e => e.type === 'haushalt')
            const hasConflict = day.events.some(e => e.conflict)
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                   style={{ background: selDay === i ? 'rgba(10,132,255,0.1)' : 'var(--bg-surface)',
                            border: `1px solid ${hasConflict ? 'rgba(255,69,58,0.35)' : selDay === i ? 'rgba(10,132,255,0.3)' : 'var(--border-subtle)'}` }}
                   onClick={() => setSelDay(i)}>
                <span className="text-xs font-semibold w-6" style={{ color: 'var(--text-muted)' }}>{DAY_SHORT[i]}</span>
                <div className="flex-1 flex flex-wrap gap-1">
                  {isUni && <Tag label="🎓 Uni" color="var(--accent)" />}
                  {sessions.map((s, j) => <Tag key={j} label={`${s.emoji} ${s.title.split('–')[0].trim()}`} color={s.type === 'run' ? '#ff453a' : '#bf5af2'} />)}
                  {appts.map((a, j) => <Tag key={`a${j}`} label={`📅 ${a.title}`} color="#ff9f0a" />)}
                  {hasHaushalt && <Tag label="🏠 Haushalt" color="#40c8e0" />}
                  {i === 6 && <Tag label="🌿 Regeneration" color="var(--green)" />}
                  {hasConflict && <Tag label="⚠ Konflikt" color="#ff453a" />}
                </div>
                {trainMin > 0 && <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{trainMin}min</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* ICS info */}
      <div className="mt-6 p-4 rounded-2xl" style={{ background: 'rgba(10,132,255,0.06)', border: '1px solid rgba(10,132,255,0.15)' }}>
        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent)' }}>📲 In Apple Kalender importieren</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          .ics exportieren → Datei auf iPhone/Mac öffnen → "Zum Kalender hinzufügen" → Fertig.
          Wegzeiten, Termine und Trainingsblöcke erscheinen automatisch.
        </p>
      </div>
    </div>
  )
}

// ── Small UI helpers ───────────────────────────────────────────────────────

const inputStyle = {
  background: 'var(--bg-elevated)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-subtle)',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{title}</p>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      {children}
    </div>
  )
}

function Pill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={active
              ? { background: 'var(--accent)', color: '#000' }
              : { background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
      {label}
    </button>
  )
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-md font-medium"
          style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {label}
    </span>
  )
}
