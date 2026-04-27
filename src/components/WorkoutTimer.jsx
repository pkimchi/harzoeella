import { useState, useEffect, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { TODAY } from '../context/DataContext'

const PRESETS = [5, 7, 10]

export default function WorkoutTimer() {
  const { user }                   = useAuth()
  const [duration, setDuration]    = useState(5)
  const [timeLeft, setTimeLeft]    = useState(5 * 60)
  const [running, setRunning]      = useState(false)
  const [done, setDone]            = useState(false)
  const [saved, setSaved]          = useState(false)
  const intervalRef                = useRef(null)

  const resetTimer = useCallback((mins) => {
    clearInterval(intervalRef.current)
    setRunning(false)
    setDone(false)
    setSaved(false)
    setTimeLeft(mins * 60)
  }, [])

  useEffect(() => {
    resetTimer(duration)
  }, [duration, resetTimer])

  useEffect(() => {
    if (done && !saved && user) {
      supabase.from('workouts').insert({
        user_id: user.id,
        date: TODAY,
        duration_minutes: duration,
        completed: true,
      }).then(() => setSaved(true))
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('HarZoElla', { body: `${duration}-min workout complete!` })
      }
    }
  }, [done, saved, user, duration])

  const start = () => {
    if (done) return
    setRunning(true)
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          setRunning(false)
          setDone(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const pause = () => {
    clearInterval(intervalRef.current)
    setRunning(false)
  }

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const pct  = ((duration * 60 - timeLeft) / (duration * 60)) * 100

  const r     = 54
  const circ  = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Duration selector */}
      <div className="flex gap-2">
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => { setDuration(p); resetTimer(p) }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all
              ${duration === p
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {p} min
          </button>
        ))}
      </div>

      {/* Ring timer */}
      <div className="relative inline-flex items-center justify-center">
        <svg width={140} height={140} className="-rotate-90">
          <circle cx={70} cy={70} r={r} stroke="#f3f4f6" strokeWidth={12} fill="none" />
          <circle
            cx={70} cy={70} r={r}
            stroke={done ? '#059669' : '#10b981'}
            strokeWidth={12} fill="none"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.9s linear' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          {done ? (
            <span className="text-3xl">✓</span>
          ) : (
            <span className="text-2xl font-bold tabular-nums text-gray-900">
              {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
            </span>
          )}
          {!done && <span className="text-xs text-gray-400 mt-0.5">remaining</span>}
        </div>
      </div>

      {done ? (
        <div className="text-center space-y-2">
          <p className="font-semibold text-brand-600">Workout complete! {saved ? 'Saved.' : ''}</p>
          <button
            onClick={() => resetTimer(duration)}
            className="text-sm text-gray-500 underline"
          >
            Reset
          </button>
        </div>
      ) : (
        <div className="flex gap-3">
          {!running ? (
            <button
              onClick={start}
              className="px-8 py-2.5 bg-brand-500 text-white rounded-full font-semibold shadow-sm hover:bg-brand-600 transition-colors"
            >
              {timeLeft === duration * 60 ? 'Start' : 'Resume'}
            </button>
          ) : (
            <button
              onClick={pause}
              className="px-8 py-2.5 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300 transition-colors"
            >
              Pause
            </button>
          )}
          <button
            onClick={() => resetTimer(duration)}
            className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-full font-medium hover:bg-gray-200 transition-colors"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  )
}
