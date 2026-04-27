import { useEffect, useState } from 'react'
import { format, subDays } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { useData, CHECKLIST_ITEMS, GOAL } from '../context/DataContext'
import { supabase } from '../lib/supabase'
import ProgressRing from '../components/ProgressRing'

export default function Dashboard() {
  const { user }                    = useAuth()
  const { todayLog, streak, completedCount, totalCount } = useData()
  const [recentWeight, setRecentWeight] = useState(null)
  const [recentBP, setRecentBP]         = useState(null)
  const [weekDots, setWeekDots]         = useState([])
  const [displayName, setDisplayName]   = useState('')

  const pct = Math.min(Math.round((completedCount / GOAL) * 100), 100)

  useEffect(() => {
    if (!user) return

    // Load display name from prefs
    supabase.from('user_prefs').select('display_name').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name || user.email.split('@')[0]))

    // Recent weight
    supabase.from('weight_logs').select('weight,unit,date').eq('user_id', user.id)
      .order('date', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setRecentWeight(data))

    // Recent BP
    supabase.from('bp_logs').select('systolic,diastolic,date').eq('user_id', user.id)
      .order('date', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setRecentBP(data))

    // Last 7 days logs for dots (built-in + custom workouts)
    const since = format(subDays(new Date(), 6), 'yyyy-MM-dd')
    Promise.all([
      supabase.from('daily_logs')
        .select('date, water, vitamins, healthy_eating, sleep_7hrs, stretch, is_lazy_day')
        .eq('user_id', user.id)
        .gte('date', since)
        .order('date', { ascending: true }),
      supabase.from('custom_workout_completions')
        .select('date')
        .eq('user_id', user.id)
        .gte('date', since)
        .eq('completed', true),
    ]).then(([{ data: logData }, { data: cwData }]) => {
      const logMap = {}
      logData?.forEach(l => { logMap[l.date] = l })

      const cwMap = {}
      cwData?.forEach(c => { cwMap[c.date] = (cwMap[c.date] || 0) + 1 })

      const dots = Array.from({ length: 7 }, (_, i) => {
        const d      = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
        const log    = logMap[d]
        const builtIn = log ? CHECKLIST_ITEMS.filter(item => log[item.key]).length : 0
        const custom  = cwMap[d] || 0
        return {
          date: d,
          label: format(subDays(new Date(), 6 - i), 'EEE'),
          done: builtIn + custom,
          isLazy: log?.is_lazy_day,
          isToday: d === format(new Date(), 'yyyy-MM-dd'),
        }
      })
      setWeekDots(dots)
    })
  }, [user])

  const dotColor = (dot) => {
    if (dot.isLazy) return 'bg-blue-300'
    if (dot.done >= GOAL) return 'bg-brand-500'
    if (dot.done >= 3) return 'bg-brand-300'
    if (dot.done >= 1) return 'bg-amber-400'
    if (new Date(dot.date) > new Date()) return 'bg-gray-100'
    return 'bg-gray-200'
  }

  const greetingTime = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="px-4 pt-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{greetingTime()}</p>
          <h1 className="text-2xl font-bold text-gray-900 capitalize">{displayName}</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">{format(new Date(), 'EEEE')}</p>
          <p className="text-sm font-medium text-gray-600">{format(new Date(), 'MMM d, yyyy')}</p>
        </div>
      </div>

      {/* Progress + Streak row */}
      <div className="flex gap-4">
        <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2">
          <ProgressRing progress={pct} size={100} stroke={9}>
            <span className="text-xl font-bold text-gray-900">{pct}%</span>
          </ProgressRing>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-500">Today's checklist</p>
            <p className="text-xs text-gray-400">{completedCount}/{GOAL} done</p>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center gap-1">
          <span className="text-4xl font-bold text-brand-500">{streak}</span>
          <p className="text-xs font-medium text-gray-500">day streak</p>
          {streak > 0 && (
            <span className="mt-1 text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full font-medium">
              Keep it up!
            </span>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Steps"
          value={todayLog?.steps ? todayLog.steps.toLocaleString() : '—'}
          sub="today"
          icon="👟"
        />
        <StatCard
          label="Weight"
          value={recentWeight ? `${recentWeight.weight}` : '—'}
          sub={recentWeight ? recentWeight.unit : 'no data'}
          icon="⚖️"
        />
        <StatCard
          label="BP"
          value={recentBP ? `${recentBP.systolic}/${recentBP.diastolic}` : '—'}
          sub={recentBP ? format(new Date(recentBP.date + 'T00:00:00'), 'MMM d') : 'no data'}
          icon="❤️"
        />
      </div>

      {/* 7-day streak dots */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-semibold text-gray-700 mb-3">Last 7 Days</p>
        <div className="flex justify-between items-end">
          {weekDots.map(dot => (
            <div key={dot.date} className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full ${dotColor(dot)}
                  ${dot.isToday ? 'ring-2 ring-brand-400 ring-offset-1' : ''}`}
              />
              <span className={`text-[10px] font-medium ${dot.isToday ? 'text-brand-500' : 'text-gray-400'}`}>
                {dot.label}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-500 inline-block"/>Goal (5+)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Partial</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-300 inline-block"/>Lazy day</span>
        </div>
      </div>

      {/* Lazy day indicator */}
      {todayLog?.is_lazy_day && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
          <p className="text-blue-700 font-medium text-sm">Lazy day mode — rest up, tomorrow is a new start.</p>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, icon }) {
  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
      <span className="text-xl">{icon}</span>
      <p className="text-base font-bold text-gray-900 mt-1 leading-tight">{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
      <p className="text-[10px] text-gray-500 font-medium">{label}</p>
    </div>
  )
}
