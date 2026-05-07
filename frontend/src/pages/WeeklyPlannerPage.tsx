import { useState, useEffect } from 'react'
import { Download, ChevronRight, RefreshCw, Plus, X } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { endpoints } from '../api/client'

// ── Types ──────────────────────────────────────────────────────────────────

type EventType =
  | 'sleep' | 'routine' | 'food' | 'run' | 'strength' | 'recovery_sport'
  | 'uni' | 'coding' | 'reading' | 'free' | 'recovery'
  | 'appointment' | 'travel' | 'haushalt' | 'study' | 'thesis'

interface FixedAppointment {
  id: string
  dayIndex: number
  title: string
  startMin: number
  durationMin: number
  travelMin: number
}

interface PlanEvent {
  title: string
  emoji: string
  start: number
  end: number
  type: EventType
  desc: string
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
  travelUniMin: number
  travelGymMin: number
  haushaltMin: number
  haushaltDay: number
  haushaltStart: number
  studyHoursWeekly: number    // 0 = disabled
  thesisHoursWeekly: number   // 0 = disabled
  studyBlockMin: number       // session length in minutes
  bedMin: number
}

// ── Training data ──────────────────────────────────────────────────────────

interface TrainSession {
  title: string
  emoji: string
  dur: number
  desc: string
  type: 'run' | 'strength' | 'recovery_sport'
  preferredStart?: number
}

const P1: Array<{ morning?: TrainSession; evening?: TrainSession }> = [
  { morning: { title: 'Lauf – Intervall-Grundlage', emoji: '🏃', dur: 80, type: 'run',
      desc: '2km einlaufen · 10×400m @85% Pace (75s Pause) · 2km auslaufen · ~10km gesamt' },
    evening: { title: 'Kraft – Oberkörper Supersätze', emoji: '💪', dur: 75, type: 'strength',
      desc: 'Supersatz A 5×: Liegestütze + Klimmzüge · Supersatz B 4×: Dips + Schulterdrücken · Core 4×' } },
  { morning: { title: 'Lauf – Intervalle + Sprint', emoji: '🏃', dur: 75, type: 'run',
      desc: '2km einlaufen · 8×400m @88% · 6×50m Sprints VOLLGAS · 2km auslaufen' },
    evening: { title: 'Koordination & Kraft – Explosiv', emoji: '💥', dur: 75, type: 'strength',
      desc: 'Wechselsprünge 5×40s · Plyometrie 4×10 · 3 Runden: Liegestütze+Klimmzüge+Kniebeugen' } },
  { morning: { title: 'Unterkörper – Explosiv & Kraft', emoji: '🦵', dur: 75, type: 'strength',
      desc: 'Wechselsprünge 5×40s · Box Jumps 5×10 · Kniebeugen 6×6 · Romanian Deadlift 5×8' },
    evening: { title: 'Testdisziplinen + Gleichgewicht', emoji: '🎯', dur: 60, type: 'strength',
      desc: 'CKCU-Test 6 Durchgänge · 6×200m Sprint-Pace · Einbeinstand 4×45s' } },
  { evening: { title: 'Lauf – Schwellenläufe', emoji: '🏃', dur: 75, type: 'run',
      desc: '2km einlaufen · 3×2000m @Laktatschwelle (90s Pause) · 2km auslaufen' },
    morning: { title: 'Kraft – Ganzkörper Komplex', emoji: '💀', dur: 75, type: 'strength',
      desc: 'Kreuzheben 5×5 · Weighted Pull-Ups 5×6 · Supersatz 4×: Liegestütze + Dips' } },
  { evening: { title: '3.000m Testlauf + Kraft-Nachbrenner', emoji: '⏱️', dur: 50, type: 'run',
      desc: '10min Aufwärmen · 3000m VOLLGAS · 3× [10 Klimmzüge + 20 Liegestütze]' },
    morning: { title: 'Testdisziplinen + Kondition', emoji: '🎯', dur: 60, type: 'strength',
      desc: 'CKCU-Test 8 Durchgänge · 8×200m @90% · Rucksack 6kg: 6×200m' } },
  { morning: { title: 'MEGA-SESSION – Feuerwehr-Simulation', emoji: '💀', dur: 120, type: 'run',
      desc: '8km Einlaufen · 6 Runden (Klimmzüge + Liegestütze + Kniebeugen + 400m Sprint) · Cool-Down' },
    evening: { title: 'Koordination & Härte', emoji: '🔥', dur: 90, type: 'strength', preferredStart: 15 * 60,
      desc: '6×400m @85% · Seitwärts-Shuffles · Kältebad + Foam Rolling 25min' } },
  { morning: { title: 'Aktive Regeneration', emoji: '🌿', dur: 40, type: 'recovery_sport',
      desc: '40min lockeres Schwimmen oder Spazieren – kein intensiver Sport' },
    evening: { title: 'Foam Rolling & Stretching', emoji: '🧘', dur: 45, type: 'recovery_sport', preferredStart: 11 * 60,
      desc: 'Foam Rolling 25min · Stretching 20min – tief und langsam' } },
]

const TRAINING_BY_PHASE: Record<number, typeof P1> = { 1: P1, 2: P1, 3: P1 }
const UNI_DAYS = new Set([3, 4])

// ── Core slot-finder ───────────────────────────────────────────────────────

interface Block { start: number; end: number }

/** Returns earliest start >= `from` where `duration` fits without overlapping any fixed block. */
function findSlot(fixed: Block[], from: number, duration: number): number {
  let c = from
  for (let i = 0; i < 40; i++) {
    const hit = fixed.find(b => c < b.end && c + duration > b.start)
    if (!hit) return c
    c = hit.end
  }
  return c
}

// ── Schedule generation ────────────────────────────────────────────────────

function generatePlan(cfg: PlanConfig, fixedAppts: FixedAppointment[] = []): DayPlan[] {
  const training = TRAINING_BY_PHASE[cfg.phase] ?? P1
  const days: DayPlan[] = []

  // ── Distribute study/thesis across Mon–Sat ────────────────────────────────
  const studyPerDay  = cfg.studyHoursWeekly  > 0 ? Math.round((cfg.studyHoursWeekly  * 60) / 6) : 0
  const thesisPerDay = cfg.thesisHoursWeekly > 0 ? Math.round((cfg.thesisHoursWeekly * 60) / 6) : 0

  for (let d = 0; d < 7; d++) {
    const date = new Date(cfg.weekStart)
    date.setDate(date.getDate() + d)
    const events: PlanEvent[] = []
    const day = training[d]
    const isUni    = UNI_DAYS.has(d)
    const isSunday = d === 6
    const ev = (e: PlanEvent) => events.push(e)

    // ── Build fixed blocks for this day ──────────────────────────────────────
    const fixed: Block[] = []

    if (isUni) {
      const uniBlockStart = cfg.uniStart - cfg.travelUniMin
      const uniBlockEnd   = cfg.uniEnd   + cfg.travelUniMin
      fixed.push({ start: uniBlockStart, end: uniBlockEnd })
    }

    if (cfg.haushaltMin > 0 && d === cfg.haushaltDay) {
      fixed.push({ start: cfg.haushaltStart, end: cfg.haushaltStart + cfg.haushaltMin })
    }

    for (const appt of fixedAppts.filter(a => a.dayIndex === d)) {
      fixed.push({
        start: appt.startMin - appt.travelMin,
        end:   appt.startMin + appt.durationMin + appt.travelMin,
      })
    }

    fixed.sort((a, b) => a.start - b.start)

    // ── Sleep + routine ───────────────────────────────────────────────────────
    ev({ title: 'Schlafen', emoji: '😴', start: 0, end: cfg.wakeMin, type: 'sleep',
      desc: `${Math.round(cfg.wakeMin / 60)}h Schlaf` })
    ev({ title: isSunday ? 'Ausschlafen & Morgenroutine' : 'Morgenroutine & Frühstück', emoji: '☀️',
      start: cfg.wakeMin, end: cfg.wakeMin + cfg.routineMin, type: 'routine',
      desc: 'Aufstehen · Hygiene · Frühstück · kurz ankommen' })

    let cursor = cfg.wakeMin + cfg.routineMin

    // ── Helper: place training block (with travel) ────────────────────────────
    function placeTraining(session: TrainSession, preferFrom: number): number {
      const totalDur = session.dur + cfg.travelGymMin * 2 + 30 // training + travel both ways + recovery
      const start = findSlot(fixed, preferFrom, totalDur)
      if (cfg.travelGymMin > 0) {
        ev({ title: 'Weg zum Training', emoji: '🚶', start, end: start + cfg.travelGymMin,
          type: 'travel', desc: `${cfg.travelGymMin}min Anfahrt` })
      }
      const trainStart = start + cfg.travelGymMin
      ev({ title: session.title, emoji: session.emoji,
        start: trainStart, end: trainStart + session.dur,
        type: session.type, desc: session.desc })
      const recStart = trainStart + session.dur
      ev({ title: cfg.travelGymMin > 0 ? 'Dusche & Weg nach Hause' : 'Recovery & Dusche', emoji: '🚿',
        start: recStart, end: recStart + 30 + cfg.travelGymMin, type: 'recovery',
        desc: cfg.travelGymMin > 0 ? `Duschen · dehnen · ${cfg.travelGymMin}min Heimweg` : 'Kaltdusche · dehnen · Protein-Shake' })
      return recStart + 30 + cfg.travelGymMin
    }

    // ── Helper: place study/thesis block ─────────────────────────────────────
    function placeWork(from: number, minutes: number, type: 'study' | 'thesis', deadline: number): number {
      if (minutes <= 0) return from
      const remaining = Math.min(minutes, deadline - from - 15)
      if (remaining < 20) return from
      // Split into blocks of studyBlockMin
      let c = from
      let left = remaining
      while (left >= 20 && c + 20 < deadline) {
        const blockDur = Math.min(left, cfg.studyBlockMin)
        const slot = findSlot(fixed, c, blockDur)
        if (slot + blockDur > deadline) break
        if (type === 'study') {
          ev({ title: 'Lernen', emoji: '📖', start: slot, end: slot + blockDur, type: 'study',
            desc: `Lernblock ${blockDur}min · Fokus & Konzentration` })
        } else {
          ev({ title: 'Bachelorarbeit / Hausarbeit', emoji: '✍️', start: slot, end: slot + blockDur, type: 'thesis',
            desc: `Schreibblock ${blockDur}min · Deep Work` })
        }
        c = slot + blockDur + 10
        left -= blockDur
      }
      return c
    }

    // ── Sunday ─────────────────────────────────────────────────────────────────
    if (isSunday) {
      const morTrain = day.morning
      if (morTrain) {
        cursor = placeTraining(morTrain, cursor)
      }
      const aftTrain = day.evening
      if (aftTrain) {
        const prefer = aftTrain.preferredStart ?? 11 * 60
        placeTraining(aftTrain, findSlot(fixed, prefer, aftTrain.dur + cfg.travelGymMin * 2 + 30))
      }
      const readStart = findSlot(fixed, Math.max(cursor, 12 * 60), cfg.readingMin)
      ev({ title: 'Freie Zeit & Erholung', emoji: '🎯', start: cursor, end: readStart, type: 'free',
        desc: 'Entspannen · Freunde / Familie · keine Pflichten' })
      ev({ title: 'Lesen', emoji: '📚', start: readStart, end: readStart + cfg.readingMin, type: 'reading',
        desc: `${cfg.readingMin}min Lesen – ruhige Stimmung` })
      ev({ title: 'Wind-down & Abendroutine', emoji: '🌙', start: cfg.bedMin - 30, end: cfg.bedMin, type: 'routine',
        desc: 'Licht dimmen · kein Handy · früh schlafen → 9h Ziel' })

    // ── Uni days (Thu + Fri) ───────────────────────────────────────────────────
    } else if (isUni) {
      const uniDept = cfg.uniStart - cfg.travelUniMin   // when to leave home
      const uniDone = cfg.uniEnd   + cfg.travelUniMin   // when back home

      // Morning: study/thesis before uni if time allows
      if (studyPerDay > 0 && cursor + 30 < uniDept) {
        cursor = placeWork(cursor, studyPerDay, 'study', uniDept - 5)
      } else if (thesisPerDay > 0 && cursor + 30 < uniDept) {
        cursor = placeWork(cursor, thesisPerDay, 'thesis', uniDept - 5)
      }

      // Travel to uni
      if (cfg.travelUniMin > 0) {
        ev({ title: 'Weg zur Uni', emoji: '🚶', start: uniDept, end: cfg.uniStart, type: 'travel',
          desc: `${cfg.travelUniMin}min Anfahrt zur Uni` })
      }
      ev({ title: 'Uni', emoji: '🎓', start: cfg.uniStart, end: cfg.uniEnd, type: 'uni',
        desc: 'Vorlesungen & Übungen' })
      if (cfg.travelUniMin > 0) {
        ev({ title: 'Weg nach Hause', emoji: '🚶', start: cfg.uniEnd, end: uniDone, type: 'travel',
          desc: `${cfg.travelUniMin}min Heimweg` })
      }

      cursor = uniDone

      // Lunch
      const lunchSlot = findSlot(fixed, cursor, 60)
      ev({ title: 'Mittagessen & Pause', emoji: '🍽️', start: lunchSlot, end: lunchSlot + 60, type: 'food',
        desc: 'Mittagessen – gut essen, Energie tanken' })
      cursor = lunchSlot + 60

      // Afternoon: study/thesis + reading before evening training
      const eveningTrainPref = 18 * 60
      const travelBuffer = cfg.travelGymMin
      const eveningDeadline = eveningTrainPref - travelBuffer - 15

      if (studyPerDay > 0) {
        cursor = placeWork(cursor, studyPerDay, 'study', eveningDeadline)
      }
      if (thesisPerDay > 0) {
        cursor = placeWork(cursor, thesisPerDay, 'thesis', eveningDeadline)
      }

      const readSlot = findSlot(fixed, cursor, cfg.readingMin)
      if (readSlot + cfg.readingMin < eveningDeadline) {
        ev({ title: 'Lesen', emoji: '📚', start: readSlot, end: readSlot + cfg.readingMin, type: 'reading',
          desc: `${cfg.readingMin}min Lesen` })
        cursor = readSlot + cfg.readingMin + 10
      }

      // Free time gap
      const evTrainStart = findSlot(fixed, eveningTrainPref - travelBuffer, day.evening ? (day.evening.dur + cfg.travelGymMin * 2 + 30) : 1)
      if (cursor + 15 < evTrainStart - travelBuffer) {
        ev({ title: 'Freie Zeit', emoji: '🎯', start: cursor, end: evTrainStart - travelBuffer, type: 'free',
          desc: 'Entspannen · Spazieren · keine Pflichten' })
      }

      // Evening training
      const evTrain = day.evening
      if (evTrain) {
        const after = placeTraining(evTrain, evTrainStart - travelBuffer)
        ev({ title: 'Abendessen', emoji: '🍽️', start: after, end: after + 45, type: 'food',
          desc: 'Abendessen · viel Protein' })
        const windDown = after + 45
        if (windDown < cfg.bedMin - 30) {
          ev({ title: 'Freie Zeit & Abend', emoji: '🌙', start: windDown, end: cfg.bedMin - 15, type: 'free',
            desc: 'Entspannen · keine harten Bildschirme nach 23:00' })
        }
      } else {
        ev({ title: 'Abend & Wind-down', emoji: '🌙', start: cursor, end: cfg.bedMin - 15, type: 'free', desc: '' })
      }
      ev({ title: 'Abendroutine & Schlaf', emoji: '🌙', start: cfg.bedMin - 15, end: cfg.bedMin, type: 'routine',
        desc: 'Zähneputzen · Licht aus' })

    // ── Saturday ───────────────────────────────────────────────────────────────
    } else if (d === 5) {
      const morTrain = day.morning!
      cursor = placeTraining(morTrain, cursor)

      // Study/thesis after mega session
      const aftPref = (day.evening?.preferredStart ?? 15 * 60) - cfg.travelGymMin - 15
      if (studyPerDay > 0) {
        cursor = placeWork(cursor, studyPerDay, 'study', aftPref)
      }
      if (thesisPerDay > 0) {
        cursor = placeWork(cursor, thesisPerDay, 'thesis', aftPref)
      }

      // Afternoon training (preferred 15:00)
      const aftTrain = day.evening!
      const aftPrefer = findSlot(fixed, (aftTrain.preferredStart ?? 15 * 60) - cfg.travelGymMin, aftTrain.dur + cfg.travelGymMin * 2 + 30)
      const afterAft = placeTraining(aftTrain, aftPrefer)

      ev({ title: 'Abendessen & Erholung', emoji: '🍽️', start: afterAft, end: afterAft + 45, type: 'food',
        desc: 'Viel essen – Kohlenhydrate & Protein · Regeneration beginnt jetzt' })
      const freeStart = afterAft + 45
      if (freeStart < cfg.bedMin - 30) {
        ev({ title: 'Freie Zeit & Wochenende', emoji: '🎯', start: freeStart, end: cfg.bedMin - 15, type: 'free',
          desc: 'Entspannen · Freunde · Social' })
      }
      ev({ title: 'Schlaf vorbereiten', emoji: '🌙', start: cfg.bedMin - 15, end: cfg.bedMin, type: 'routine', desc: '' })

    // ── Normal weekday (Mon, Tue, Wed) ─────────────────────────────────────────
    } else {
      // Morning training
      const morTrain = day.morning
      if (morTrain) {
        cursor = placeTraining(morTrain, cursor)
      }

      // Morning deep work: thesis first (highest priority), then study
      const lunchDeadline = 12 * 60
      if (thesisPerDay > 0 && cursor + 20 < lunchDeadline) {
        cursor = placeWork(cursor, thesisPerDay, 'thesis', lunchDeadline)
      }
      if (cfg.programmingMin > 0 && cursor + 20 < lunchDeadline) {
        const progSlot = findSlot(fixed, cursor, Math.min(cfg.programmingMin, lunchDeadline - cursor))
        const progDur  = Math.min(cfg.programmingMin, lunchDeadline - progSlot)
        if (progDur >= 20) {
          ev({ title: 'Programmieren', emoji: '💻', start: progSlot, end: progSlot + progDur, type: 'coding',
            desc: 'Deep Work Block · schwierige Aufgaben in der produktiven Phase angehen' })
          cursor = progSlot + progDur
        }
      }
      if (studyPerDay > 0 && cursor + 20 < lunchDeadline) {
        cursor = placeWork(cursor, studyPerDay, 'study', lunchDeadline)
      }

      // Lunch
      const lunchSlot = findSlot(fixed, Math.max(cursor, 12 * 60), 60)
      ev({ title: 'Mittagessen', emoji: '🍽️', start: lunchSlot, end: lunchSlot + 60, type: 'food',
        desc: 'Ausgewogen essen · Kohlenhydrate & Protein für Abendtraining' })
      cursor = lunchSlot + 60

      // Afternoon reading
      const evPref = 18 * 60
      const travelBuffer = cfg.travelGymMin
      const aftDeadline = evPref - travelBuffer - 15
      const readSlot = findSlot(fixed, cursor, cfg.readingMin)
      if (readSlot + cfg.readingMin < aftDeadline) {
        ev({ title: 'Lesen', emoji: '📚', start: readSlot, end: readSlot + cfg.readingMin, type: 'reading',
          desc: `${cfg.readingMin}min konzentriertes Lesen – Handy weglegen` })
        cursor = readSlot + cfg.readingMin + 10
      }

      // Free time before evening training
      const evTrain = day.evening
      const totalEvDur = evTrain ? (evTrain.dur + cfg.travelGymMin * 2 + 30) : 0
      const evSlot = evTrain ? findSlot(fixed, evPref - travelBuffer, totalEvDur) : evPref
      if (cursor + 15 < evSlot) {
        ev({ title: 'Freie Zeit', emoji: '🎯', start: cursor, end: evSlot, type: 'free',
          desc: 'Spazieren · Nap · Social · Nichts tun ist auch Training' })
      }

      // Evening training
      if (evTrain) {
        const after = placeTraining(evTrain, evSlot)
        ev({ title: 'Abendessen & Regeneration', emoji: '🍽️', start: after, end: after + 45, type: 'food',
          desc: 'Duschen · Abendessen · viel Protein · BCAA/Creatine' })
        const windDown = after + 45
        if (windDown < cfg.bedMin - 15) {
          ev({ title: 'Freie Zeit & Abend', emoji: '🌙', start: windDown, end: cfg.bedMin - 15, type: 'free',
            desc: 'Entspannen · serien/lesen/nichts tun' })
        }
      }

      ev({ title: 'Schlaf vorbereiten', emoji: '🌙', start: cfg.bedMin - 15, end: cfg.bedMin, type: 'routine',
        desc: 'Zähneputzen · Licht aus · Handy weg' })
    }

    // ── Haushalt ──────────────────────────────────────────────────────────────
    if (cfg.haushaltMin > 0 && d === cfg.haushaltDay) {
      ev({ title: 'Haushalt & Aufräumen', emoji: '🏠',
        start: cfg.haushaltStart, end: cfg.haushaltStart + cfg.haushaltMin,
        type: 'haushalt', desc: 'Aufräumen · Putzen · Wäsche · Einkaufen' })
    }

    // ── Fixed appointments + travel ───────────────────────────────────────────
    for (const appt of fixedAppts.filter(a => a.dayIndex === d)) {
      if (appt.travelMin > 0) {
        ev({ title: `Weg: ${appt.title}`, emoji: '🚶',
          start: appt.startMin - appt.travelMin, end: appt.startMin,
          type: 'travel', desc: `${appt.travelMin}min Anfahrt` })
      }
      ev({ title: appt.title, emoji: '📅',
        start: appt.startMin, end: appt.startMin + appt.durationMin,
        type: 'appointment',
        desc: appt.travelMin > 0 ? `Fester Termin · ${appt.travelMin}min Wegzeit je Richtung` : 'Fester Termin' })
      if (appt.travelMin > 0) {
        const ret = appt.startMin + appt.durationMin
        ev({ title: 'Rückweg', emoji: '🚶', start: ret, end: ret + appt.travelMin,
          type: 'travel', desc: `${appt.travelMin}min Heimweg` })
      }
    }

    events.sort((a, b) => a.start - b.start)
    days.push({ dayIndex: d, date, events })
  }

  return days
}

// ── ICS export ─────────────────────────────────────────────────────────────

function fmtICS(date: Date, mins: number): string {
  const d = new Date(date)
  let m = mins
  if (m >= 24 * 60) { d.setDate(d.getDate() + 1); m -= 24 * 60 }
  const Y = d.getFullYear(), M = String(d.getMonth() + 1).padStart(2, '0'), D = String(d.getDate()).padStart(2, '0')
  const HH = String(Math.floor(m / 60)).padStart(2, '0'), MM = String(m % 60).padStart(2, '0')
  return `${Y}${M}${D}T${HH}${MM}00`
}

function exportICS(days: DayPlan[], cfg: PlanConfig) {
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//PersonalOS//WeeklyPlanner//DE',
    'CALSCALE:GREGORIAN','X-WR-CALNAME:PersonalOS Wochenplan','X-WR-TIMEZONE:Europe/Berlin']
  for (const day of days) {
    for (const ev of day.events) {
      if (ev.type === 'sleep' || ev.type === 'free') continue
      const uid = `${day.date.toISOString().slice(0, 10)}-${ev.start}-${Math.random().toString(36).slice(2)}@personalos`
      lines.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTART:${fmtICS(day.date, ev.start)}`,
        `DTEND:${fmtICS(day.date, ev.end)}`, `SUMMARY:${ev.emoji} ${ev.title}`,
        `DESCRIPTION:${ev.desc.replace(/\n/g, '\\n')}`, `CATEGORIES:${ev.type.toUpperCase()}`, 'END:VEVENT')
    }
  }
  lines.push('END:VCALENDAR')
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `PersonalOS_Woche_${cfg.weekStart.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }).replace('.', '-')}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toMins(h: number, m: number) { return h * 60 + m }
function minsToTime(m: number): string {
  const hh = Math.floor((m % (24 * 60)) / 60), mm = m % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}
function getNextMonday(): Date {
  const d = new Date()
  const dow = d.getDay()
  const diff = dow === 0 ? 1 : 8 - dow
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}
function dateToInput(d: Date) { return d.toISOString().slice(0, 10) }

// ── Color map ──────────────────────────────────────────────────────────────

const TYPE_STYLE: Record<EventType, { bg: string; color: string; border: string }> = {
  sleep:          { bg: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)',   border: 'rgba(255,255,255,0.06)' },
  routine:        { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)',   border: 'rgba(255,255,255,0.1)'  },
  food:           { bg: 'rgba(255,214,10,0.08)',  color: '#ffd60a',             border: 'rgba(255,214,10,0.2)'   },
  run:            { bg: 'rgba(255,69,58,0.1)',    color: '#ff453a',             border: 'rgba(255,69,58,0.3)'    },
  strength:       { bg: 'rgba(191,90,242,0.1)',   color: '#bf5af2',             border: 'rgba(191,90,242,0.3)'   },
  recovery_sport: { bg: 'rgba(48,209,88,0.08)',   color: 'var(--green)',        border: 'rgba(48,209,88,0.2)'    },
  uni:            { bg: 'rgba(10,132,255,0.12)',  color: 'var(--accent)',       border: 'rgba(10,132,255,0.3)'   },
  coding:         { bg: 'rgba(48,209,88,0.1)',    color: 'var(--green)',        border: 'rgba(48,209,88,0.25)'   },
  reading:        { bg: 'rgba(255,214,10,0.08)',  color: '#ffd60a',             border: 'rgba(255,214,10,0.2)'   },
  free:           { bg: 'transparent',            color: 'var(--text-muted)',   border: 'transparent'            },
  recovery:       { bg: 'rgba(48,209,88,0.06)',   color: 'var(--text-muted)',   border: 'rgba(48,209,88,0.15)'   },
  appointment:    { bg: 'rgba(255,159,10,0.1)',   color: '#ff9f0a',             border: 'rgba(255,159,10,0.3)'   },
  travel:         { bg: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)',   border: 'rgba(255,255,255,0.08)' },
  haushalt:       { bg: 'rgba(64,200,224,0.08)',  color: '#40c8e0',             border: 'rgba(64,200,224,0.25)'  },
  study:          { bg: 'rgba(10,132,255,0.1)',   color: '#409cff',             border: 'rgba(10,132,255,0.28)'  },
  thesis:         { bg: 'rgba(255,55,95,0.08)',   color: '#ff375f',             border: 'rgba(255,55,95,0.25)'   },
}

const DAY_NAMES  = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag']
const DAY_SHORT  = ['Mo','Di','Mi','Do','Fr','Sa','So']

// ── Page ───────────────────────────────────────────────────────────────────

export default function WeeklyPlannerPage() {
  const [step, setStep] = useState<'wizard' | 'plan'>('wizard')
  const [selDay, setSelDay] = useState(0)

  const [weekStart,   setWeekStart]   = useState(dateToInput(getNextMonday()))
  const [phase,       setPhase]       = useState<1|2|3>(1)
  const [phaseWeek,   setPhaseWeek]   = useState<1|2|3|4>(1)
  const [wakeTime,    setWakeTime]    = useState('07:15')
  const [routineMin,  setRoutineMin]  = useState(30)
  const [uniStart,    setUniStart]    = useState('09:00')
  const [uniEnd,      setUniEnd]      = useState('13:00')
  const [travelUniMin, setTravelUniMin] = useState(0)
  const [travelGymMin, setTravelGymMin] = useState(0)
  const [progHours,   setProgHours]   = useState(2)
  const [readingMin,  setReadingMin]  = useState(60)
  const [haushaltMin, setHaushaltMin] = useState(0)
  const [haushaltDay, setHaushaltDay] = useState(5)
  const [haushaltStart, setHaushaltStart] = useState('10:00')
  const [studyHours,  setStudyHours]  = useState(0)
  const [thesisHours, setThesisHours] = useState(0)
  const [studyBlockMin, setStudyBlockMin] = useState(90)

  const [appointments, setAppointments] = useState<FixedAppointment[]>([])
  const [apptDayIdx,  setApptDayIdx]  = useState(0)
  const [apptTitle,   setApptTitle]   = useState('')
  const [apptStart,   setApptStart]   = useState('10:00')
  const [apptDur,     setApptDur]     = useState(60)
  const [apptTravel,  setApptTravel]  = useState(0)

  const [cfg,  setCfg]  = useState<PlanConfig | null>(null)
  const [plan, setPlan] = useState<DayPlan[]>([])

  // Load persisted config on mount
  useEffect(() => {
    endpoints.weeklyConfig().then(r => {
      const d = r.data
      if (!d || !d.wake_time) return
      setWakeTime(d.wake_time)
      setRoutineMin(d.routine_min ?? 30)
      setProgHours(d.prog_hours ?? 2)
      setReadingMin(d.reading_min ?? 60)
      setUniStart(d.uni_start ?? '09:00')
      setUniEnd(d.uni_end ?? '13:00')
      setTravelUniMin(d.travel_uni_min ?? 0)
      setTravelGymMin(d.travel_gym_min ?? 0)
      setHaushaltMin(d.haushalt_min ?? 0)
      setHaushaltDay(d.haushalt_day ?? 5)
      setHaushaltStart(d.haushalt_start ?? '10:00')
      setStudyHours(d.study_hours ?? 0)
      setThesisHours(d.thesis_hours ?? 0)
      setStudyBlockMin(d.study_block_min ?? 90)
      setPhase((d.phase ?? 1) as 1|2|3)
      setPhaseWeek((d.phase_week ?? 1) as 1|2|3|4)
    }).catch(() => {})

    endpoints.weeklyAppointments().then(r => {
      setAppointments((r.data ?? []).map((a: Record<string, unknown>) => ({
        id:          String(a.appt_id),
        dayIndex:    Number(a.day_index),
        title:       String(a.title),
        startMin:    Number(a.start_min),
        durationMin: Number(a.duration_min),
        travelMin:   Number(a.travel_min),
      })))
    }).catch(() => {})
  }, [])

  function addAppointment() {
    if (!apptTitle.trim()) return
    const [h, m] = apptStart.split(':').map(Number)
    const body = {
      day_index:    apptDayIdx,
      title:        apptTitle.trim(),
      start_min:    h * 60 + m,
      duration_min: apptDur,
      travel_min:   apptTravel,
    }
    endpoints.createWeeklyAppointment(body).then(r => {
      const id = r.data?.id ?? Math.random().toString(36).slice(2)
      setAppointments(prev => [...prev, {
        id, dayIndex: body.day_index, title: body.title,
        startMin: body.start_min, durationMin: body.duration_min, travelMin: body.travel_min,
      }])
    }).catch(() => {
      setAppointments(prev => [...prev, {
        id: Math.random().toString(36).slice(2),
        dayIndex: body.day_index, title: body.title,
        startMin: body.start_min, durationMin: body.duration_min, travelMin: body.travel_min,
      }])
    })
    setApptTitle(''); setApptTravel(0)
  }

  function buildConfig(): PlanConfig {
    const [wh, wm]   = wakeTime.split(':').map(Number)
    const [ush, usm] = uniStart.split(':').map(Number)
    const [ueh, uem] = uniEnd.split(':').map(Number)
    const [hsh, hsm] = haushaltStart.split(':').map(Number)
    return {
      weekStart: new Date(weekStart + 'T00:00:00'),
      phase, phaseWeek,
      wakeMin: toMins(wh, wm), routineMin,
      programmingMin: progHours * 60, readingMin,
      uniStart: toMins(ush, usm), uniEnd: toMins(ueh, uem),
      travelUniMin, travelGymMin,
      haushaltMin, haushaltDay, haushaltStart: toMins(hsh, hsm),
      studyHoursWeekly: studyHours,
      thesisHoursWeekly: thesisHours,
      studyBlockMin,
      bedMin: 24 * 60,
    }
  }

  async function generate() {
    const c = buildConfig()
    // Load calendar events for this week and merge as fixed appointments
    const weekEnd = new Date(c.weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const from = c.weekStart.toISOString().slice(0, 10)
    const to   = weekEnd.toISOString().slice(0, 10)

    let allAppts = [...appointments]
    try {
      const evRes = await endpoints.calendarEvents(from, to)
      const calAppts: FixedAppointment[] = (evRes.data ?? [])
        .filter((e: Record<string, unknown>) => e.start_time)
        .map((e: Record<string, unknown>) => {
          const evDate = new Date(String(e.event_date) + 'T00:00:00')
          const diffDays = Math.round((evDate.getTime() - c.weekStart.getTime()) / 86400000)
          const dayIndex = Math.max(0, Math.min(6, diffDays))
          const [sh, sm] = String(e.start_time ?? '09:00').split(':').map(Number)
          const startMin = sh * 60 + sm
          let durationMin = 60
          if (e.end_time) {
            const [eh, em] = String(e.end_time).split(':').map(Number)
            durationMin = Math.max(15, eh * 60 + em - startMin)
          }
          return {
            id: `cal_${e.id}`,
            dayIndex,
            title: String(e.title),
            startMin,
            durationMin,
            travelMin: 0,
          }
        })
      // Only add calendar events not already covered by manual appointments
      const existingIds = new Set(appointments.map(a => a.id))
      allAppts = [...appointments, ...calAppts.filter(a => !existingIds.has(a.id))]
    } catch { /* silently skip if offline */ }

    setCfg(c); setPlan(generatePlan(c, allAppts))
    setStep('plan'); setSelDay(0)

    // Persist config
    endpoints.saveWeeklyConfig({
      wake_time:       wakeTime,
      routine_min:     routineMin,
      prog_hours:      progHours,
      reading_min:     readingMin,
      uni_start:       uniStart,
      uni_end:         uniEnd,
      travel_uni_min:  travelUniMin,
      travel_gym_min:  travelGymMin,
      haushalt_min:    haushaltMin,
      haushalt_day:    haushaltDay,
      haushalt_start:  haushaltStart,
      study_hours:     studyHours,
      thesis_hours:    thesisHours,
      study_block_min: studyBlockMin,
      phase,
      phase_week:      phaseWeek,
    }).catch(() => {})
  }

  // ── Wizard ────────────────────────────────────────────────────────────────

  if (step === 'wizard') {
    return (
      <div className="page-root" style={{ maxWidth: 580 }}>
        <PageHeader title="Wochenplaner" subtitle="Generiere deine perfekte Woche." />
        <div className="space-y-5">

          <Section title="Woche">
            <Row label="Start (Montag)">
              <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)}
                     className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
            </Row>
            <Row label="Trainingsphase">
              <div className="flex gap-1">
                {([1,2,3] as const).map(p => <Pill key={p} active={phase===p} onClick={() => setPhase(p)} label={`Phase ${p}`} />)}
              </div>
            </Row>
            <Row label="Woche in Phase">
              <div className="flex gap-1">
                {([1,2,3,4] as const).map(w => <Pill key={w} active={phaseWeek===w} onClick={() => setPhaseWeek(w)} label={`W${w}`} />)}
              </div>
            </Row>
          </Section>

          {/* ── Feste Termine ─────────────────────────────────── */}
          <div className="rounded-2xl overflow-hidden"
               style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,159,10,0.3)' }}>
            <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,159,10,0.2)', background: 'rgba(255,159,10,0.06)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#ff9f0a' }}>📅 Feste Termine</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Werden inkl. Wegzeit in den Plan eingeplant — ohne Überschneidungen</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <select value={apptDayIdx} onChange={e => setApptDayIdx(Number(e.target.value))}
                        className="px-3 py-2 rounded-xl text-sm outline-none flex-shrink-0" style={inputStyle}>
                  {DAY_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
                </select>
                <input type="text" placeholder="Titel des Termins" value={apptTitle}
                       onChange={e => setApptTitle(e.target.value)}
                       onKeyDown={e => { if (e.key === 'Enter') addAppointment() }}
                       className="flex-1 px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Uhrzeit</label>
                  <input type="time" value={apptStart} onChange={e => setApptStart(e.target.value)}
                         className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Dauer</label>
                  <div className="flex gap-1 flex-wrap">
                    {[30,60,90,120].map(m => <Pill key={m} active={apptDur===m} onClick={() => setApptDur(m)} label={m>=60?`${m/60}h`:`${m}min`} />)}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Wegzeit je Richtung</label>
                <div className="flex gap-1 flex-wrap">
                  {[0,10,15,20,30,45,60].map(m => <Pill key={m} active={apptTravel===m} onClick={() => setApptTravel(m)} label={m===0?'Keine':`${m}min`} />)}
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
                          {minsToTime(a.startMin)} · {a.durationMin}min{a.travelMin > 0 && ` · 🚶 ${a.travelMin}min Weg`}
                        </p>
                      </div>
                      <button onClick={() => {
                        endpoints.deleteWeeklyAppointment(a.id).catch(() => {})
                        setAppointments(prev => prev.filter(x => x.id !== a.id))
                      }} className="p-1 rounded hover:opacity-70 flex-shrink-0">
                        <X size={12} style={{ color: 'var(--text-muted)' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Section title="Tagesrhythmus">
            <Row label="Aufwachen">
              <input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)}
                     className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
            </Row>
            <Row label="Morgenroutine">
              <div className="flex gap-1">
                {[20,30,45,60].map(m => <Pill key={m} active={routineMin===m} onClick={() => setRoutineMin(m)} label={`${m}min`} />)}
              </div>
            </Row>
          </Section>

          <Section title="Uni (Do + Fr)">
            <Row label="Beginn">
              <input type="time" value={uniStart} onChange={e => setUniStart(e.target.value)}
                     className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
            </Row>
            <Row label="Ende">
              <input type="time" value={uniEnd} onChange={e => setUniEnd(e.target.value)}
                     className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
            </Row>
            <Row label="Wegzeit je Richtung">
              <div className="flex gap-1 flex-wrap">
                {[0,10,15,20,30,45,60].map(m => <Pill key={m} active={travelUniMin===m} onClick={() => setTravelUniMin(m)} label={m===0?'Keine':`${m}min`} />)}
              </div>
            </Row>
          </Section>

          <Section title="Training">
            <Row label="Wegzeit zum Gym je Richtung">
              <div className="flex gap-1 flex-wrap">
                {[0,10,15,20,30,45].map(m => <Pill key={m} active={travelGymMin===m} onClick={() => setTravelGymMin(m)} label={m===0?'Keine':`${m}min`} />)}
              </div>
            </Row>
          </Section>

          <Section title="Aktivitäten">
            <Row label="Programmieren / Tag">
              <div className="flex gap-1">
                {[0,1,2,3,4].map(h => <Pill key={h} active={progHours===h} onClick={() => setProgHours(h)} label={h===0?'Keins':`${h}h`} />)}
              </div>
            </Row>
            <Row label="Lesen / Tag">
              <div className="flex gap-1">
                {[45,60,75].map(m => <Pill key={m} active={readingMin===m} onClick={() => setReadingMin(m)} label={`${m}min`} />)}
              </div>
            </Row>
          </Section>

          {/* ── Lernen & Schreiben ──────────────────────────── */}
          <div className="rounded-2xl overflow-hidden"
               style={{ background: 'var(--bg-surface)', border: '1px solid rgba(64,153,255,0.3)' }}>
            <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(64,153,255,0.2)', background: 'rgba(64,153,255,0.06)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#409cff' }}>📖 Lernen & Schreiben</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Gesamtstunden/Woche – werden als Blöcke auf Mo–Sa verteilt</p>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              <Row label="Lernen / Woche">
                <div className="flex gap-1 flex-wrap">
                  {[0,2,4,6,8,10,14].map(h => <Pill key={h} active={studyHours===h} onClick={() => setStudyHours(h)} label={h===0?'Keins':`${h}h`} />)}
                </div>
              </Row>
              <Row label="Bachelorarbeit / Hausarbeit / Woche">
                <div className="flex gap-1 flex-wrap">
                  {[0,2,4,6,8,10,14].map(h => <Pill key={h} active={thesisHours===h} onClick={() => setThesisHours(h)} label={h===0?'Keins':`${h}h`} />)}
                </div>
              </Row>
              {(studyHours > 0 || thesisHours > 0) && (
                <Row label="Blockgröße">
                  <div className="flex gap-1">
                    {[45,60,90,120].map(m => <Pill key={m} active={studyBlockMin===m} onClick={() => setStudyBlockMin(m)} label={m>=60?`${m/60}h`:`${m}min`} />)}
                  </div>
                </Row>
              )}
            </div>
          </div>

          <Section title="Haushalt">
            <Row label="Zeit einplanen">
              <div className="flex gap-1 flex-wrap">
                {[0,30,60,90,120].map(m => <Pill key={m} active={haushaltMin===m} onClick={() => setHaushaltMin(m)} label={m===0?'Keins':m>=60?`${m/60}h`:`${m}min`} />)}
              </div>
            </Row>
            {haushaltMin > 0 && <>
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
            </>}
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

  // ── Plan view ─────────────────────────────────────────────────────────────

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
          const isUni   = day.events.some(e => e.type === 'uni')
          const hasAppt = day.events.some(e => e.type === 'appointment')
          const hasStudy = day.events.some(e => e.type === 'study' || e.type === 'thesis')
          return (
            <button key={i} onClick={() => setSelDay(i)}
                    className="flex-shrink-0 flex flex-col items-center py-2.5 px-3 rounded-xl transition-all"
                    style={selDay === i
                      ? { background: 'var(--accent)', color: '#000' }
                      : { background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <span className="text-[10px] font-semibold">{DAY_SHORT[i]}</span>
              <span className="text-xs mt-0.5">{day.date.getDate()}</span>
              <div className="flex gap-0.5 mt-1">
                {hasTraining && <div className="w-1.5 h-1.5 rounded-full" style={{ background: selDay === i ? '#000' : '#ff453a' }} />}
                {isUni  && <div className="w-1.5 h-1.5 rounded-full" style={{ background: selDay === i ? '#000' : 'var(--accent)' }} />}
                {hasAppt && <div className="w-1.5 h-1.5 rounded-full" style={{ background: selDay === i ? '#000' : '#ff9f0a' }} />}
                {hasStudy && <div className="w-1.5 h-1.5 rounded-full" style={{ background: selDay === i ? '#000' : '#409cff' }} />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Day detail */}
      {currentDay && (
        <div>
          <p className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            {DAY_NAMES[currentDay.dayIndex]}, {currentDay.date.toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })}
          </p>
          <div className="space-y-1.5">
            {currentDay.events.map((ev, i) => {
              const style = TYPE_STYLE[ev.type]
              if (ev.type === 'sleep') return (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl opacity-40" style={{ background: style.bg }}>
                  <span className="text-sm w-5 text-center">{ev.emoji}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>00:00 – {minsToTime(ev.end)} · Schlafen</span>
                </div>
              )
              if (ev.type === 'travel') return (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl opacity-60"
                     style={{ background: style.bg, border: `1px solid ${style.border}` }}>
                  <span className="text-sm w-5 text-center">{ev.emoji}</span>
                  <span className="text-xs flex-1" style={{ color: style.color }}>{ev.title}</span>
                  <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {minsToTime(ev.start % (24*60))} – {minsToTime(ev.end % (24*60))}
                  </span>
                </div>
              )
              return (
                <div key={i} className="px-4 py-3 rounded-2xl"
                     style={{ background: style.bg, border: `1px solid ${style.border}` }}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">{ev.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-semibold" style={{ color: style.color }}>{ev.title}</span>
                        <span className="text-[10px] font-medium tabular-nums flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                          {minsToTime(ev.start % (24*60))} – {minsToTime(ev.end % (24*60))}
                          <span className="ml-1 opacity-60">({ev.end - ev.start}min)</span>
                        </span>
                      </div>
                      {ev.desc && <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{ev.desc}</p>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Day summary */}
          <div className="mt-6 grid grid-cols-4 gap-2">
            {[
              { label: 'Training',  value: currentDay.events.filter(e => e.type==='run'||e.type==='strength').reduce((s,e)=>s+e.end-e.start,0), color: '#ff453a' },
              { label: 'Lernen',    value: currentDay.events.filter(e => e.type==='study'||e.type==='thesis'||e.type==='uni').reduce((s,e)=>s+e.end-e.start,0), color: '#409cff' },
              { label: 'Unterwegs', value: currentDay.events.filter(e => e.type==='travel').reduce((s,e)=>s+e.end-e.start,0), color: 'var(--text-muted)' },
              { label: 'Frei',      value: currentDay.events.filter(e => e.type==='free').reduce((s,e)=>s+e.end-e.start,0), color: 'var(--green)' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-2xl text-center"
                   style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <p className="text-base font-semibold tabular-nums" style={{ color: s.color }}>{s.value}min</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Week overview */}
      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Wochenübersicht</p>
        <div className="space-y-1.5">
          {plan.map((day, i) => {
            const trainMin  = day.events.filter(e => e.type==='run'||e.type==='strength').reduce((s,e)=>s+e.end-e.start,0)
            const studyMin  = day.events.filter(e => e.type==='study'||e.type==='thesis').reduce((s,e)=>s+e.end-e.start,0)
            const isUni     = day.events.some(e => e.type==='uni')
            const sessions  = day.events.filter(e => e.type==='run'||e.type==='strength')
            const appts     = day.events.filter(e => e.type==='appointment')
            const hasHaushalt = day.events.some(e => e.type==='haushalt')
            return (
              <div key={i} onClick={() => setSelDay(i)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                   style={{ background: selDay===i ? 'rgba(10,132,255,0.1)' : 'var(--bg-surface)',
                            border: `1px solid ${selDay===i ? 'rgba(10,132,255,0.3)' : 'var(--border-subtle)'}` }}>
                <span className="text-xs font-semibold w-6" style={{ color: 'var(--text-muted)' }}>{DAY_SHORT[i]}</span>
                <div className="flex-1 flex flex-wrap gap-1">
                  {isUni && <Tag label="🎓 Uni" color="var(--accent)" />}
                  {sessions.map((s,j) => <Tag key={j} label={`${s.emoji} ${s.title.split('–')[0].trim()}`} color={s.type==='run'?'#ff453a':'#bf5af2'} />)}
                  {appts.map((a,j) => <Tag key={`a${j}`} label={`📅 ${a.title}`} color="#ff9f0a" />)}
                  {studyMin > 0 && <Tag label={`📖 ${Math.round(studyMin/60*10)/10}h`} color="#409cff" />}
                  {hasHaushalt && <Tag label="🏠 Haushalt" color="#40c8e0" />}
                  {i===6 && <Tag label="🌿 Regeneration" color="var(--green)" />}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {trainMin > 0 && <span className="text-xs tabular-nums" style={{ color: '#ff453a' }}>{trainMin}min</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-6 p-4 rounded-2xl" style={{ background: 'rgba(10,132,255,0.06)', border: '1px solid rgba(10,132,255,0.15)' }}>
        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent)' }}>📲 In Apple Kalender importieren</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          .ics exportieren → Datei öffnen → "Zum Kalender hinzufügen". Alle Blöcke inkl. Wegzeiten und Lernzeiten erscheinen automatisch.
        </p>
      </div>
    </div>
  )
}

// ── Small UI helpers ───────────────────────────────────────────────────────

const inputStyle = { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{title}</p>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>{children}</div>
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
    <button onClick={onClick} className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={active ? { background: 'var(--accent)', color: '#000' } : { background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
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
