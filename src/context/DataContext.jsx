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

const GOAL = 5

export { CHECKLIST_ITEMS, GOAL, TODAY }

export function DataProvider({ children }) {
  const { user }            = useAuth()
  const [todayLog, setTodayLog]   = useState(null)
  const [streak, setStreak]       = useState(0)
  const [loadingData, setLoading] = useState(true)
  const [customWorkouts, setCustomWorkouts]       = useState([])
  const [todayCompletions, setTodayCompletions]   = useState({})

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

    const [{ data: logData }, { data: cwData }] = await Promise.all([
      supabase
        .from('daily_logs')
        .select('date, water, vitamins, healthy_eating, sleep_7hrs, stretch, is_lazy_day')
        .eq('user_id', user.id)
        .gte('date', since)
        .order('date', { ascending: false }),
      supabase
        .from('custom_workout_completions')
        .select('date')
        .eq('user_id', user.id)
        .gte('date', since)
        .eq('completed', true),
    ])

    const logMap = {}
    logData?.forEach(l => { logMap[l.date] = l })

    const cwMap = {}
    cwData?.forEach(c => { cwMap[c.date] = (cwMap[c.date] || 0) + 1 })

    let count = 0
    const todayEntry = logMap[TODAY]
    const todayBuiltIn = todayEntry ? CHECKLIST_ITEMS.filter(i => todayEntry[i.key]).length : 0
    const todayCustom = cwMap[TODAY] || 0
    const todayActive = todayEntry?.is_lazy_day || (todayBuiltIn + todayCustom) >= GOAL
    const startOffset = todayActive ? 0 : 1

    for (let i = startOffset; i <= 120; i++) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
      const log = logMap[d]
      const customCount = cwMap[d] || 0
      if (!log && customCount === 0) break
      const builtIn = log ? CHECKLIST_ITEMS.filter(item => log[item.key]).length : 0
      const hasActivity = log?.is_lazy_day || (builtIn + customCount) >= GOAL
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

  const loadCustomWorkouts = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('custom_workouts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    setCustomWorkouts(data || [])
  }, [user])

  const loadTodayCompletions = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('custom_workout_completions')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', TODAY)
    const map = {}
    data?.forEach(c => { map[c.workout_id] = c.completed })
    setTodayCompletions(map)
  }, [user])

  const addCustomWorkout = useCallback(async (name, durationMinutes, description) => {
    if (!user) return { error: new Error('Not authenticated') }
    const { data, error } = await supabase
      .from('custom_workouts')
      .insert({
        user_id: user.id,
        name,
        duration_minutes: durationMinutes,
        description: description || null,
      })
      .select()
      .single()
    if (!error) setCustomWorkouts(prev => [...prev, data])
    return { data, error }
  }, [user])

  const deleteCustomWorkout = useCallback(async (id) => {
    if (!user) return { error: new Error('Not authenticated') }
    const { error } = await supabase
      .from('custom_workouts')
      .delete()
      .eq('id', id)
    if (!error) {
      setCustomWorkouts(prev => prev.filter(w => w.id !== id))
      setTodayCompletions(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
    return { error }
  }, [user])

  const toggleCustomWorkout = useCallback(async (workoutId, current) => {
    if (!user) return { error: new Error('Not authenticated') }
    setTodayCompletions(prev => ({ ...prev, [workoutId]: !current }))
    const { error } = await supabase
      .from('custom_workout_completions')
      .upsert(
        { user_id: user.id, workout_id: workoutId, date: TODAY, completed: !current },
        { onConflict: 'user_id,workout_id,date' }
      )
    if (error) {
      setTodayCompletions(prev => ({ ...prev, [workoutId]: current }))
    } else {
      calculateStreak()
    }
    return { error }
  }, [user, calculateStreak])

  useEffect(() => {
    if (user) {
      setLoading(true)
      Promise.all([
        loadTodayLog(),
        calculateStreak(),
        loadCustomWorkouts(),
        loadTodayCompletions(),
      ]).finally(() => setLoading(false))
    }
  }, [user, loadTodayLog, calculateStreak, loadCustomWorkouts, loadTodayCompletions])

  const builtInCompleted = todayLog ? CHECKLIST_ITEMS.filter(i => todayLog[i.key]).length : 0
  const customCompleted  = customWorkouts.filter(w => todayCompletions[w.id]).length
  const completedCount   = builtInCompleted + customCompleted
  const totalCount       = CHECKLIST_ITEMS.length + customWorkouts.length

  return (
    <DataContext.Provider value={{
      todayLog,
      streak,
      loadingData,
      completedCount,
      totalCount,
      customWorkouts,
      todayCompletions,
      toggleChecklistItem,
      markLazyDay,
      upsertTodayLog,
      loadTodayLog,
      addCustomWorkout,
      deleteCustomWorkout,
      toggleCustomWorkout,
      goal: GOAL,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
