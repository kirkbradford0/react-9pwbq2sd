"use client"

import { useState } from "react"
import LockedInput from "./LockedInput"
import DeferredQueue from "./DeferredQueue"

type Props = {
  score: number
  reasons: string[]
}

export default function SafeModePage({ score, reasons }: Props) {
  const [showDeferred, setShowDeferred] = useState(false)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6 py-12">

      {/* Score indicator */}
      <div className="mb-6 flex flex-col items-center gap-1">
        <span className="text-5xl font-bold text-yellow-400">{score}</span>
        <span className="text-xs text-gray-500 uppercase tracking-widest">FM Score</span>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-semibold mb-3">Safe Mode Active</h1>

      {/* Reason pills */}
      {reasons.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-6 max-w-sm">
          {reasons.map((r, i) => (
            <span
              key={i}
              className="text-xs bg-gray-800 text-gray-300 px-3 py-1 rounded-full"
            >
              {r}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      <p className="text-center text-gray-400 max-w-md mb-8 text-sm leading-relaxed">
        Your score is below the safe threshold. The app has reduced to one action
        to protect your progress and prevent impulsive decisions.
      </p>

      {/* Primary Action — 1 step only */}
      <button
        onClick={() => setShowDeferred(true)}
        className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl text-base font-medium mb-6 transition-colors"
      >
        Capture a Thought (1 Step)
      </button>

      {/* Deferred queue — expands on action */}
      {showDeferred && <DeferredQueue />}

      {/* IP protection layer */}
      {!showDeferred && <LockedInput />}

      {/* Exit — intentionally de-emphasized */}
      <button className="text-gray-600 hover:text-gray-400 mt-8 text-xs transition-colors">
        Exit Safe Mode
      </button>

    </div>
  )
}
