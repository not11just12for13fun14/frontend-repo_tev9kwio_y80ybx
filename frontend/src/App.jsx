import { useEffect, useMemo, useState } from 'react'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function NumberStat({ label, value, suffix }) {
  return (
    <div className="flex flex-col items-start">
      <div className="text-zinc-400 text-xs uppercase tracking-wide">{label}</div>
      <div className="text-3xl font-semibold text-white">
        {value}
        {suffix && <span className="text-zinc-400 text-lg ml-1">{suffix}</span>}
      </div>
    </div>
  )
}

function Progress({ percent }) {
  const p = Math.min(100, Math.max(0, percent || 0))
  return (
    <div className="w-full h-2 bg-zinc-800 rounded">
      <div
        className="h-2 rounded bg-pink-500 transition-all"
        style={{ width: `${p}%` }}
      />
    </div>
  )
}

function usePoll(url, interval = 1500) {
  const [data, setData] = useState(null)
  useEffect(() => {
    let timer
    const fetcher = async () => {
      try {
        const res = await fetch(url)
        const json = await res.json()
        setData(json)
      } catch (e) {
        // ignore
      }
      timer = setTimeout(fetcher, interval)
    }
    fetcher()
    return () => clearTimeout(timer)
  }, [url, interval])
  return data
}

function AddAPIForm({ onCreated }) {
  const [form, setForm] = useState({
    name: 'OpenAI',
    provider: 'OpenAI',
    window_seconds: 60,
    max_requests: 3500,
    thresholds: [80, 90, 95],
  })
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/apis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.api) onCreated(json.api)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-3 bg-zinc-900 p-4 rounded-lg border border-zinc-800">
      <input
        className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white"
        placeholder="Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <input
        className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white"
        placeholder="Provider"
        value={form.provider}
        onChange={(e) => setForm({ ...form, provider: e.target.value })}
      />
      <input
        type="number"
        className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white"
        placeholder="Window (sec)"
        value={form.window_seconds}
        onChange={(e) => setForm({ ...form, window_seconds: Number(e.target.value) })}
      />
      <input
        type="number"
        className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white"
        placeholder="Max requests"
        value={form.max_requests}
        onChange={(e) => setForm({ ...form, max_requests: Number(e.target.value) })}
      />
      <button
        disabled={loading}
        className="col-span-2 bg-pink-500 hover:bg-pink-600 text-white rounded px-3 py-2 font-medium"
      >
        {loading ? 'Adding…' : 'Register API'}
      </button>
    </form>
  )
}

function StatusCard({ api }) {
  const data = usePoll(`${API_URL}/status/${api._id}`)
  const crossed = (data?.thresholds_crossed || [])
  const color = crossed.length >= 3 ? 'text-red-400' : crossed.length >= 2 ? 'text-amber-400' : 'text-emerald-400'
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white font-medium">{api.name}</div>
          <div className="text-xs text-zinc-400">{api.provider}</div>
        </div>
        <div className={`text-sm ${color}`}>
          {data ? `${data.utilization_percent}% used` : '—'}
        </div>
      </div>
      <Progress percent={data?.utilization_percent || 0} />
      <div className="grid grid-cols-4 gap-4">
        <NumberStat label="Window" value={api.window_seconds} suffix="sec" />
        <NumberStat label="Limit" value={api.max_requests} />
        <NumberStat label="Used" value={data?.current_count || 0} />
        <NumberStat label="ETA" value={data?.projected_hit_in_seconds ?? '—'} suffix={data?.projected_hit_in_seconds ? 'sec' : ''} />
      </div>
    </div>
  )
}

export default function App() {
  const [apis, setApis] = useState([])
  const list = async () => {
    const res = await fetch(`${API_URL}/apis`)
    const json = await res.json()
    setApis(json)
  }
  useEffect(() => { list() }, [])

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800/60 bg-zinc-950 sticky top-0">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-6 bg-pink-500 rounded-sm" />
            <div className="text-white font-semibold tracking-tight">Throttl</div>
          </div>
          <div className="text-xs text-zinc-400">Real-time API rate limit monitoring</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <section className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h1 className="text-white text-2xl font-semibold">Prevent the 3 AM panic</h1>
            <p className="text-zinc-400">
              Track usage against rate limits in real-time. Get predictive alerts before outages.
            </p>
          </div>
          <AddAPIForm onCreated={() => list()} />
        </section>

        <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apis.length === 0 && (
            <div className="text-zinc-400">No APIs yet. Add one to start monitoring.</div>
          )}
          {apis.map((a) => (
            <StatusCard key={a._id} api={a} />
          ))}
        </section>
      </main>
    </div>
  )
}
