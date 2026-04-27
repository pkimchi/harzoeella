import { useState } from 'react'
import { format } from 'date-fns'
import { useData, CHECKLIST_ITEMS } from '../context/DataContext'
import WorkoutTimer from '../components/WorkoutTimer'

const DURATION_PRESETS = [10, 20, 30, 45, 60]

function Checkmark() {
  return (
    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export default function Today() {
  const {
    todayLog, toggleChecklistItem, markLazyDay, upsertTodayLog,
    customWorkouts, todayCompletions, toggleCustomWorkout,
    addCustomWorkout, deleteCustomWorkout,
  } = useData()

  const [stepsInput, setStepsInput]   = useState('')
  const [stepsSaved, setStepsSaved]   = useState(false)
  const [lazyConfirm, setLazyConfirm] = useState(false)

  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName]           = useState('')
  const [newDuration, setNewDuration]   = useState('')
  const [newDesc, setNewDesc]           = useState('')
  const [saving, setSaving]             = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

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

  const handleAddWorkout = async () => {
    const name = newName.trim()
    const dur  = parseInt(newDuration, 10)
    if (!name || !dur || dur < 1) return
    setSaving(true)
    await addCustomWorkout(name, dur, newDesc.trim())
    setNewName('')
    setNewDuration('')
    setNewDesc('')
    setShowAddForm(false)
    setSaving(false)
  }

  const handleCancelAdd = () => {
    setShowAddForm(false)
    setNewName('')
    setNewDuration('')
    setNewDesc('')
  }

  const handleDelete = async (id) => {
    if (deleteConfirm !== id) { setDeleteConfirm(id); return }
    await deleteCustomWorkout(id)
    setDeleteConfirm(null)
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
          {/* Built-in items */}
          {CHECKLIST_ITEMS.map(({ key, label, icon }) => {
            const checked = todayLog?.[key] ?? false
            return (
              <li key={key}>
                <button
                  onClick={() => toggleChecklistItem(key, checked)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                  disabled={todayLog?.is_lazy_day}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 check-transition
                    ${checked ? 'bg-brand-500 border-brand-500' : 'border-gray-300 bg-white'}`}
                  >
                    {checked && <Checkmark />}
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

          {/* Custom workout items */}
          {customWorkouts.map(workout => {
            const checked     = todayCompletions[workout.id] ?? false
            const confirmingDelete = deleteConfirm === workout.id
            return (
              <li key={workout.id} className="divide-y-0">
                <div className="flex items-stretch hover:bg-gray-50 transition-colors">
                  <button
                    onClick={() => toggleCustomWorkout(workout.id, checked)}
                    className="flex-1 flex items-center gap-4 px-4 py-3.5 text-left"
                    disabled={todayLog?.is_lazy_day}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 check-transition
                      ${checked ? 'bg-brand-500 border-brand-500' : 'border-gray-300 bg-white'}`}
                    >
                      {checked && <Checkmark />}
                    </div>
                    <span className="text-lg">🏋️</span>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium block ${checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {workout.name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {workout.duration_minutes} min
                        {workout.description ? ` · ${workout.description}` : ''}
                      </span>
                    </div>
                    {checked && <span className="text-xs text-brand-500 font-medium">Done</span>}
                  </button>

                  {/* Delete button — tap once to arm, tap again to confirm */}
                  <button
                    onClick={() => handleDelete(workout.id)}
                    onBlur={() => setDeleteConfirm(null)}
                    className={`px-3 flex items-center transition-colors ${
                      confirmingDelete ? 'text-red-500' : 'text-gray-300 hover:text-red-400'
                    }`}
                    aria-label={confirmingDelete ? 'Confirm delete' : 'Delete workout'}
                  >
                    {confirmingDelete ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
                {confirmingDelete && (
                  <p className="px-4 pb-2 text-xs text-red-400">Tap again to delete "{workout.name}"</p>
                )}
              </li>
            )
          })}
        </ul>

        {/* Add custom workout — inline form or button */}
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-brand-500 text-sm font-medium hover:bg-brand-50 transition-colors border-t border-gray-50"
          >
            <span className="w-6 h-6 rounded-full border-2 border-brand-300 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </span>
            Add Custom Workout
          </button>
        ) : (
          <div className="border-t border-gray-100 px-4 py-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">New Workout</p>

            <input
              type="text"
              placeholder="Name (e.g. Morning Run)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:border-brand-400 focus:outline-none"
              autoFocus
            />

            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                {DURATION_PRESETS.map(d => (
                  <button
                    key={d}
                    onClick={() => setNewDuration(String(d))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      newDuration === String(d)
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
              <input
                type="number"
                placeholder="Or enter custom duration (min)"
                value={newDuration}
                onChange={e => setNewDuration(e.target.value)}
                min="1"
                max="300"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:border-brand-400 focus:outline-none"
              />
            </div>

            <input
              type="text"
              placeholder="Description (optional)"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:border-brand-400 focus:outline-none"
            />

            <div className="flex gap-2">
              <button
                onClick={handleAddWorkout}
                disabled={!newName.trim() || !newDuration || saving}
                className="flex-1 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 disabled:opacity-40 transition-colors"
              >
                {saving ? 'Saving…' : 'Add Workout'}
              </button>
              <button
                onClick={handleCancelAdd}
                className="px-4 py-2.5 border border-gray-200 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
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
              ? "Tap again to confirm lazy day — it won't break your streak"
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
