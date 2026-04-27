import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function LogData() {
  const [tab, setTab] = useState('weight')

  return (
    <div className="px-4 pt-8 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Log Data</h1>

      {/* Tab switcher */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        {[['weight', '⚖️ Weight'], ['bp', '❤️ Blood Pressure']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all
              ${tab === id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'weight' ? <WeightSection /> : <BPSection />}
    </div>
  )
}

function WeightSection() {
  const { user }             = useAuth()
  const [weight, setWeight]  = useState('')
  const [unit, setUnit]      = useState('lbs')
  const [date, setDate]      = useState(format(new Date(), 'yyyy-MM-dd'))
  const [logs, setLogs]      = useState([])
  const [saving, setSaving]  = useState(false)
  const [saved, setSaved]    = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(15)
    setLogs(data || [])
    if (data?.length) setUnit(data[0].unit)
  }, [user])

  useEffect(() => { load() }, [load])

  const save = async (e) => {
    e.preventDefault()
    if (!weight || !user) return
    setSaving(true)
    const { error } = await supabase.from('weight_logs').insert({
      user_id: user.id, date, weight: parseFloat(weight), unit,
    })
    if (!error) {
      setSaved(true)
      setWeight('')
      load()
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  const del = async (id) => {
    await supabase.from('weight_logs').delete().eq('id', id)
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  return (
    <div className="space-y-4">
      <form onSubmit={save} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="text-base font-semibold text-gray-800">Add Entry</h2>
        <div className="flex gap-2">
          <input
            type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)}
            placeholder="Weight" required
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-brand-400 transition-all"
          />
          <select
            value={unit} onChange={e => setUnit(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-brand-400"
          >
            <option value="lbs">lbs</option>
            <option value="kg">kg</option>
          </select>
        </div>
        <input
          type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-brand-400 transition-all"
        />
        <button
          type="submit" disabled={saving}
          className="w-full py-2.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-60"
        >
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Weight'}
        </button>
      </form>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-base font-semibold text-gray-800">History</h2>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400 px-4 pb-4">No entries yet.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {logs.map(l => (
              <li key={l.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="font-semibold text-gray-900">{l.weight} {l.unit}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{format(new Date(l.date + 'T00:00:00'), 'MMM d, yyyy')}</p>
                </div>
                <button onClick={() => del(l.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function BPSection() {
  const { user }                   = useAuth()
  const [systolic, setSystolic]    = useState('')
  const [diastolic, setDiastolic]  = useState('')
  const [pulse, setPulse]          = useState('')
  const [notes, setNotes]          = useState('')
  const [date, setDate]            = useState(format(new Date(), 'yyyy-MM-dd'))
  const [logs, setLogs]            = useState([])
  const [saving, setSaving]        = useState(false)
  const [saved, setSaved]          = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('bp_logs').select('*').eq('user_id', user.id)
      .order('date', { ascending: false }).limit(15)
    setLogs(data || [])
  }, [user])

  useEffect(() => { load() }, [load])

  const save = async (e) => {
    e.preventDefault()
    if (!systolic || !diastolic || !user) return
    setSaving(true)
    const { error } = await supabase.from('bp_logs').insert({
      user_id: user.id, date,
      systolic: parseInt(systolic), diastolic: parseInt(diastolic),
      pulse: pulse ? parseInt(pulse) : null,
      notes: notes || null,
    })
    if (!error) {
      setSaved(true)
      setSystolic(''); setDiastolic(''); setPulse(''); setNotes('')
      load()
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  const del = async (id) => {
    await supabase.from('bp_logs').delete().eq('id', id)
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  const bpCategory = (s, d) => {
    if (s < 120 && d < 80)  return { label: 'Normal',    color: 'text-brand-600 bg-brand-50' }
    if (s < 130 && d < 80)  return { label: 'Elevated',  color: 'text-amber-600 bg-amber-50' }
    if (s < 140 || d < 90)  return { label: 'High 1',    color: 'text-orange-600 bg-orange-50' }
    return                          { label: 'High 2',    color: 'text-red-600 bg-red-50' }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={save} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="text-base font-semibold text-gray-800">Add Entry</h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Systolic (top)</label>
            <input
              type="number" value={systolic} onChange={e => setSystolic(e.target.value)}
              placeholder="120" required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-brand-400 transition-all"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Diastolic (bottom)</label>
            <input
              type="number" value={diastolic} onChange={e => setDiastolic(e.target.value)}
              placeholder="80" required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-brand-400 transition-all"
            />
          </div>
        </div>
        <input
          type="number" value={pulse} onChange={e => setPulse(e.target.value)}
          placeholder="Pulse (optional)"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-brand-400 transition-all"
        />
        <input
          type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-brand-400 transition-all"
        />
        <input
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-brand-400 transition-all"
        />
        <button
          type="submit" disabled={saving}
          className="w-full py-2.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-60"
        >
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Blood Pressure'}
        </button>
      </form>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-base font-semibold text-gray-800">History</h2>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400 px-4 pb-4">No entries yet.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {logs.map(l => {
              const cat = bpCategory(l.systolic, l.diastolic)
              return (
                <li key={l.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{l.systolic}/{l.diastolic}</span>
                      {l.pulse && <span className="text-xs text-gray-400">♥ {l.pulse}</span>}
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(l.date + 'T00:00:00'), 'MMM d, yyyy')}
                      {l.notes && ` · ${l.notes}`}
                    </p>
                  </div>
                  <button onClick={() => del(l.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
