import { useState, useEffect } from 'react'
import type { PoolStatus } from '../types'
import { getPoolStatus, resetPool } from '../utils'

interface Props {
  onBack: () => void
}

export default function SettingsScreen({ onBack }: Props) {
  const [pool, setPool] = useState<PoolStatus | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    getPoolStatus().then(setPool).catch(() => {})
  }, [])

  async function handleReset() {
    setResetting(true)
    try {
      await resetPool()
      setDone(true)
      setShowConfirm(false)
      getPoolStatus().then(setPool).catch(() => {})
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="min-h-screen pb-12 max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors">
          ←
        </button>
        <h1 className="text-xl font-bold text-white">Settings</h1>
      </div>

      {/* Pool info */}
      {pool && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Question Pool Status</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Total Questions', value: pool.total },
              { label: 'Used in Sets', value: pool.used },
              { label: 'Remaining', value: pool.remaining },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-xl font-bold text-orange-400">{value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full"
              style={{ width: `${Math.round((pool.used / pool.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div className="border border-red-500/20 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-1">Danger Zone</h2>
        <p className="text-slate-400 text-sm mb-4">
          Reset the question pool — this deletes all exam sets and results permanently. Use only when you want to start completely fresh.
        </p>

        {done && (
          <div className="mb-4 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
            ✓ Pool reset. All exam sets and results have been cleared.
          </div>
        )}

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="px-4 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm transition-colors"
          >
            Reset Question Pool
          </button>
        ) : (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-300 text-sm font-semibold mb-1">Are you sure?</p>
            <p className="text-slate-400 text-xs mb-4">
              This will permanently delete all exam sets, all attempt history, and all results. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm disabled:opacity-50"
              >
                {resetting ? 'Resetting…' : 'Yes, Reset Everything'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
