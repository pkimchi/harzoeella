import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { format, subDays } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const DataContext = createContext(null)

const TODAY = format(new Date(), 'yyyy-MM-dd')

const CHECKLIST_ITEMS = [
  { key: 'water',          label: 'Drink Water',  icon: '💧' },
  { key: 'vitamins',       label: 'Take Vitamins', icon: '💊' },
  { key: 'healthy_eating', label: 'Eat Healthy',   icon: '🥗' },
  { key: 'sleep_7hrs',     label: 'Sleep 7+ hrs',  icon: '😴' },
  { key: 'stretch',        label: 'Stretch',        icon: '🧘' },
]

export { CHECKLIST_ITEMS, TODAY }

export function DataProvider({ children }) {
  const { user }            = useAuth()
  const [todayLog, setTodayLog]   = useState(null)
  const [streak, setStreak]       = useState(0)
  const [loadingData, setLoading] = useState(true)

  const loadTodayLog = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', TODAY)
      .maybeSingle()

    setTodayLog(data)
  }, [user])

  const calculateStreak = useCallback(async () => {
    if (!user) return
    const since = format(subDays(new Date(), 120), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('daily_logs')
      .select('date, water, vitamins, healthy_eating, sleep_7hrs, stretch, is_lazy_day')
      .eq('user_id', user.id)
      .gte('date', since)
      .order('date', { ascending: false })

    const logMap = {}
    data?.forEach(l => { logMap[l.date] = l })

    let count = 0
    // Start from yesterday if today has no activity yet; otherwise include today
    const todayEntry = logMap[TODAY]
    const todayActive = todayEntry && (
      todayEntry.is_lazy_day ||
      CHECKLIST_ITEMS.some(i => todayEntry[i.key])
    )
    const startOffset = todayActive ? 0 : 1

    for (let i = startOffset; i <= 120; i++) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
      const log = logMap[d]
      if (!log) break
      const hasActivity = log.is_lazy_day || CHECKLIST_ITEMS.some(item => log[item.key])
      if (hasActivity) {
        count++
      } else {
        break
      }
    }

    setStreak(count)
  }, [user])

  const upsertTodayLog = useCallback(async (patch) => {
    if (!user) return
    const { data, error } = await supabase
      .from('daily_logs')
      .upsert(
        { user_id: user.id, date: TODAY, ...patch, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single()

    if (!error) {
      setTodayLog(data)
      calculateStreak()
    }
    return { data, error }
  }, [user, calculateStreak])

  const toggleChecklistItem = useCallback((key, current) => {
    return upsertTodayLog({ [key]: !current })
  }, [upsertTodayLog])

  const markLazyDay = useCallback(() => {
    return upsertTodayLog({ is_lazy_day: true })
  }, [upsertTodayLog])

  useEffect(() => {
    if (user) {
      setLoading(true)
      Promise.all([loadTodayLog(), calculateStreak()]).finally(() => setLoading(false))
    }
  }, [user, loadTodayLog, calculateStreak])

  const completedCount = todayLog
    ? CHECKLIST_ITEMS.filter(i => todayLog[i.key]).length
    : 0

  return (
    <DataContext.Provider value={{
      todayLog,
      streak,
      loadingData,
      completedCount,
      toggleChecklistItem,
      markLazyDay,
      upsertTodayLog,
      loadTodayLog,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
