import { useState } from 'react'
import { format } from 'date-fns'
import { useData, CHECKLIST_ITEMS } from '../context/DataContext'
import WorkoutTimer from '../components/WorkoutTimer'

export default function Today() {
  const { todayLog, toggleChecklistItem, markLazyDay, upsertTodayLog } = useData()
  const [stepsInput, setStepsInput] = useState('')
  const [stepsSaved, setStepsSaved] = useState(false)
  const [lazyConfirm, setLazyConfirm] = useState(false)

  const saveSteps = async () => {
    const n = parseInt(stepsInput, 10)
    if (!n || n < 0) return
    await upsertTodayLog({ steps: n })
    setStepsSaved(true)
    setTimeout(() => setStepsSaved(false), 2000)
  }

  const handleLazyDay = async () => {
    if (!lazyConfirm) { setLazyConfirm(true); return }
    await markLazyDay()
    setLazyConfirm(false)
  }

  return (
    <div className="px-4 pt-8 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Today</h1>
        <p className="text-gray-400 text-sm mt-0.5">{format(new Date(), 'EEEE, MMMM d')}</p>
      </div>

      {/* Daily Checklist */}
      <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-base font-semibold text-gray-800">Daily Checklist</h2>
        </div>
        <ul className="divide-y divide-gray-50">
          {CHECKLIST_ITEMS.map(({ key, label, icon }) => {
            const checked = todayLog?.[key] ?? false
            return (
              <li key={key}>
                <button
                  onClick={() => toggleChecklistItem(key, checked)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                  disabled={todayLog?.is_lazy_day}
                >
                  {/* Custom checkbox */}
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 check-transition
                    ${checked
                      ? 'bg-brand-500 border-brand-500'
                      : 'border-gray-300 bg-white'}`}
                  >
                    {checked && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-lg">{icon}</span>
                  <span className={`text-sm font-medium flex-1 ${checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {label}
                  </span>
                  {checked && <span className="text-xs text-brand-500 font-medium">Done</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Step Tracker */}
      <section className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Steps Today</h2>
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">👟</span>
            <input
              type="number"
              value={stepsInput || todayLog?.steps || ''}
              onChange={e => setStepsInput(e.target.value)}
              placeholder="e.g. 8500"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-brand-400 transition-all"
            />
          </div>
          <button
            onClick={saveSteps}
            className="px-4 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 transition-colors whitespace-nowrap"
          >
            {stepsSaved ? 'Saved!' : 'Save'}
          </button>
        </div>
        {todayLog?.steps > 0 && !stepsInput && (
          <p className="text-xs text-gray-400 mt-2">Current: {todayLog.steps.toLocaleString()} steps</p>
        )}
      </section>

      {/* Workout Timer */}
      <section className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Workout Timer</h2>
        <WorkoutTimer />
      </section>

      {/* Lazy Day Button */}
      {!todayLog?.is_lazy_day ? (
        <div className="pb-2">
          <button
            onClick={handleLazyDay}
            className={`w-full py-3 rounded-2xl border text-sm font-medium transition-all
              ${lazyConfirm
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-400 hover:text-gray-600 hover:border-gray-300'}`}
          >
            {lazyConfirm
              ? 'Tap again to confirm lazy day — it won\'t break your streak'
              : '😴  Lazy Day Backup'}
          </button>
          {lazyConfirm && (
            <button onClick={() => setLazyConfirm(false)} className="w-full text-xs text-gray-400 mt-1 py-1">
              Cancel
            </button>
          )}
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
          <p className="text-blue-700 font-medium text-sm">Lazy day activated — rest up!</p>
          <p className="text-blue-400 text-xs mt-1">Your streak is safe. See you tomorrow.</p>
        </div>
      )}
    </div>
  )
}
