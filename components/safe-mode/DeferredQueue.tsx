"use client"

import { useState } from "react"

export default function DeferredQueue() {
  const [input, setInput] = useState("")
  const [queued, setQueued] = useState<string[]>([])

  function handleSubmit() {
    const trimmed = input.trim()
    if (!trimmed) return
    setQueued((prev) => [...prev, trimmed])
    setInput("")
  }

  return (
    <div className="mt-6 w-full max-w-md">
      <p className="text-sm text-gray-400 mb-2">
        Capture thoughts — they'll be reviewed when you're back to full mode.
      </p>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={3}
        placeholder="Write it down, decide later..."
        className="w-full bg-black border border-gray-700 text-white p-3 rounded-lg resize-none focus:outline-none focus:border-purple-500"
      />

      <button
        onClick={handleSubmit}
        disabled={!input.trim()}
        className="mt-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm transition-colors"
      >
        Save for Later
      </button>

      {queued.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-gray-400">
          {queued.map((q, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-purple-500">•</span>
              <span>{q}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
