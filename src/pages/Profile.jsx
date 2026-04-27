import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function Profile() {
  const { user, signOut }         = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [weightUnit, setWeightUnit]   = useState('lbs')
  const [morningOn, setMorningOn]     = useState(false)
  const [morningTime, setMorningTime] = useState('07:00')
  const [eveningOn, setEveningOn]     = useState(false)
  const [eveningTime, setEveningTime] = useState('21:00')
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [notifStatus, setNotifStatus] = useState('default')

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('user_prefs').select('*').eq('user_id', user.id).maybeSingle()
    if (data) {
      setDisplayName(data.display_name || '')
      setWeightUnit(data.weight_unit || 'lbs')
      setMorningOn(data.reminder_morning || false)
      setMorningTime(data.reminder_morning_time || '07:00')
      setEveningOn(data.reminder_evening || false)
      setEveningTime(data.reminder_evening_time || '21:00')
    }
    if ('Notification' in window) setNotifStatus(Notification.permission)
  }, [user])

  useEffect(() => { load() }, [load])

  const requestNotifs = async () => {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifStatus(perm)
  }

  const save = async (e) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    await supabase.from('user_prefs').upsert({
      user_id: user.id,
      display_name: displayName,
      weight_unit: weightUnit,
      reminder_morning: morningOn,
      reminder_morning_time: morningTime,
      reminder_evening: eveningOn,
      reminder_evening_time: eveningTime,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    // Schedule today's reminders if permission granted
    if (notifStatus === 'granted') {
      scheduleReminder(morningOn, morningTime, 'Morning check-in', 'Time to log your daily health habits!')
      scheduleReminder(eveningOn, eveningTime, 'Evening recap', 'Don\'t forget to log today\'s activities!')
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  return (
    <div className="px-4 pt-8 space-y-5 pb-4">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      {/* User card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
        <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
          <span className="text-brand-600 font-bold text-lg">
            {(displayName || user?.email || '?')[0].toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-semibold text-gray-900">{displayName || 'Set your name'}</p>
          <p className="text-sm text-gray-400">{user?.email}</p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-4">
        {/* Display name */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="text-base font-semibold text-gray-800">Settings</h2>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Display Name</label>
            <input
              value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-brand-400 transition-all"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Weight Unit</label>
            <div className="flex gap-2">
              {['lbs', 'kg'].map(u => (
                <button
                  key={u} type="button"
                  onClick={() => setWeightUnit(u)}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-xl border transition-all
                    ${weightUnit === u
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reminders */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Reminders</h2>
            {notifStatus !== 'granted' && (
              <button
                type="button" onClick={requestNotifs}
                className="text-xs text-brand-600 font-medium bg-brand-50 px-2.5 py-1 rounded-full hover:bg-brand-100 transition-colors"
              >
                {notifStatus === 'denied' ? 'Blocked in browser' : 'Enable notifications'}
              </button>
            )}
            {notifStatus === 'granted' && (
              <span className="text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full font-medium">Active</span>
            )}
          </div>

          <ReminderRow
            label="Morning" icon="☀️"
            on={morningOn} setOn={setMorningOn}
            time={morningTime} setTime={setMorningTime}
            disabled={notifStatus !== 'granted'}
          />
          <ReminderRow
            label="Evening" icon="🌙"
            on={eveningOn} setOn={setEveningOn}
            time={eveningTime} setTime={setEveningTime}
            disabled={notifStatus !== 'granted'}
          />

          {notifStatus !== 'granted' && (
            <p className="text-xs text-gray-400">Enable browser notifications above to activate reminders. They work while the app is open.</p>
          )}
        </div>

        <button
          type="submit" disabled={saving}
          className="w-full py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-60"
        >
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="w-full py-3 bg-white border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
      >
        Sign Out
      </button>

      <p className="text-center text-xs text-gray-300 pb-2">HarZoElla v0.1.0</p>
    </div>
  )
}

function ReminderRow({ label, icon, on, setOn, time, setTime, disabled }) {
  return (
    <div className={`flex items-center gap-3 ${disabled ? 'opacity-40' : ''}`}>
      <span className="text-lg">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{label} reminder</p>
      </div>
      {on && !disabled && (
        <input
          type="time" value={time} onChange={e => setTime(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-gray-50 focus:border-brand-400"
        />
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOn(v => !v)}
        className={`relative w-11 h-6 rounded-full transition-colors ${on && !disabled ? 'bg-brand-500' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on && !disabled ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

function scheduleReminder(enabled, timeStr, title, body) {
  if (!enabled || !('Notification' in window) || Notification.permission !== 'granted') return
  const [h, m] = timeStr.split(':').map(Number)
  const now  = new Date()
  const fire = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0)
  if (fire <= now) return  // already passed today
  const delay = fire - now
  setTimeout(() => new Notification(title, { body, icon: '/favicon.svg' }), delay)
}
