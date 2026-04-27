import { useEffect, useState } from 'react'
import { format, startOfWeek, addDays, subWeeks, subDays } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useData, CHECKLIST_ITEMS } from '../context/DataContext'
import { supabase } from '../lib/supabase'

export default function WeeklySummary() {
  const { user }                 = useAuth()
  const { streak }               = useData()
  const [weekOffset, setWeekOffset] = useState(0)   // 0 = this week, -1 = last week
  const [weekData, setWeekData]  = useState([])
  const [weightData, setWeightData] = useState([])
  const [bpData, setBpData]      = useState([])
  const [workoutCount, setWorkoutCount] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)

  const weekStart = startOfWeek(subWeeks(new Date(), -weekOffset), { weekStartsOn: 1 })

  useEffect(() => {
    if (!user) return
    const start = format(weekStart, 'yyyy-MM-dd')
    const end   = format(addDays(weekStart, 6), 'yyyy-MM-dd')

    // Daily logs for this week
    supabase.from('daily_logs')
      .select('date, water, vitamins, healthy_eating, sleep_7hrs, stretch, is_lazy_day, steps')
      .eq('user_id', user.id).gte('date', start).lte('date', end)
      .then(({ data }) => {
        const logMap = {}
        data?.forEach(l => { logMap[l.date] = l })

        const days = Array.from({ length: 7 }, (_, i) => {
          const d    = format(addDays(weekStart, i), 'yyyy-MM-dd')
          const log  = logMap[d]
          const done = log ? CHECKLIST_ITEMS.filter(item => log[item.key]).length : 0
          return { date: d, label: format(addDays(weekStart, i), 'EEE'), done, isLazy: log?.is_lazy_day, steps: log?.steps || 0 }
        })

        setWeekData(days)
        setTotalSteps(days.reduce((s, d) => s + d.steps, 0))
      })

    // Workouts this week
    supabase.from('workouts').select('id').eq('user_id', user.id)
      .gte('date', start).lte('date', end).eq('completed', true)
      .then(({ data }) => setWorkoutCount(data?.length || 0))

    // Weight last 30 days for chart
    const since = format(subDays(new Date(), 29), 'yyyy-MM-dd')
    supabase.from('weight_logs').select('date, weight, unit').eq('user_id', user.id)
      .gte('date', since).order('date', { ascending: true })
      .then(({ data }) => setWeightData(data || []))

    // BP last 30 days for chart
    supabase.from('bp_logs').select('date, systolic, diastolic').eq('user_id', user.id)
      .gte('date', since).order('date', { ascending: true })
      .then(({ data }) => setBpData(data || []))
  }, [user, weekOffset])  // eslint-disable-line react-hooks/exhaustive-deps

  const completedDays = weekData.filter(d => d.done >= 3 || d.isLazy).length
  const totalDone     = weekData.reduce((s, d) => s + d.done, 0)
  const weekPct       = Math.round((totalDone / (7 * 5)) * 100)

  const dotStyle = (day) => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const isFuture = new Date(day.date) > new Date(today)
    if (isFuture) return 'bg-gray-100 border-2 border-gray-200'
    if (day.isLazy) return 'bg-blue-300'
    if (day.done === 5) return 'bg-brand-500'
    if (day.done >= 3) return 'bg-brand-300'
    if (day.done >= 1) return 'bg-amber-400'
    return 'bg-gray-200'
  }

  const weightForChart = weightData.map(d => ({
    date: format(new Date(d.date + 'T00:00:00'), 'MMM d'),
    weight: parseFloat(d.weight),
    unit: d.unit,
  }))

  const bpForChart = bpData.map(d => ({
    date: format(new Date(d.date + 'T00:00:00'), 'MMM d'),
    sys: d.systolic,
    dia: d.diastolic,
  }))

  return (
    <div className="px-4 pt-8 space-y-5 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Summary</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600"
          >
            ‹
          </button>
          <span className="text-xs text-gray-500 w-20 text-center">
            {weekOffset === 0 ? 'This week' : `${-weekOffset}w ago`}
          </span>
          <button
            onClick={() => setWeekOffset(o => Math.min(o + 1, 0))}
            disabled={weekOffset === 0}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </div>

      {/* Week dates */}
      <p className="text-sm text-gray-400 -mt-3">
        {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
      </p>

      {/* Streak dots */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between items-end mb-1">
          {weekData.map(day => (
            <div key={day.date} className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-semibold text-gray-500">{day.done}/5</span>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${dotStyle(day)}`}>
                {day.isLazy && <span className="text-sm">😴</span>}
                {!day.isLazy && day.done === 5 && <span className="text-sm text-white font-bold">✓</span>}
              </div>
              <span className="text-[10px] text-gray-400">{day.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Streak" value={streak} sub="days" color="text-brand-500" />
        <SummaryCard label="Week %" value={`${weekPct}%`} sub="completion" color="text-gray-900" />
        <SummaryCard label="Workouts" value={workoutCount} sub="this week" color="text-gray-900" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="Active Days" value={completedDays} sub="out of 7" color="text-gray-900" />
        <SummaryCard label="Steps" value={totalSteps > 0 ? totalSteps.toLocaleString() : '—'} sub="this week" color="text-gray-900" />
      </div>

      {/* Weight chart */}
      {weightForChart.length > 1 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Weight Trend (30 days)</h2>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={weightForChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #f3f4f6' }}
                formatter={(v) => [`${v} ${weightForChart[0]?.unit}`, 'Weight']}
              />
              <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* BP chart */}
      {bpForChart.length > 1 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Blood Pressure (30 days)</h2>
          <div className="flex gap-3 mb-2">
            <span className="text-xs flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 inline-block rounded"/>Systolic</span>
            <span className="text-xs flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-400 inline-block rounded"/>Diastolic</span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={bpForChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #f3f4f6' }} />
              <Line type="monotone" dataKey="sys" stroke="#f87171" strokeWidth={2} dot={{ r: 2 }} name="Systolic" />
              <Line type="monotone" dataKey="dia" stroke="#60a5fa" strokeWidth={2} dot={{ r: 2 }} name="Diastolic" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {weightForChart.length <= 1 && bpForChart.length <= 1 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <p className="text-gray-400 text-sm">Log weight and blood pressure data to see trend charts here.</p>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
      <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
    </div>
  )
}
