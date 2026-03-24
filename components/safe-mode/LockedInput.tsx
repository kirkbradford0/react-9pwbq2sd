"use client"

export default function LockedInput() {
  return (
    <div className="mt-4 w-full max-w-md">
      <div className="border border-gray-700 rounded-xl p-4 bg-gray-900">
        <p className="text-sm text-gray-400 mb-2">
          Idea sharing is limited in Safe Mode to protect your work.
        </p>
        <textarea
          disabled
          placeholder="Input disabled in Safe Mode"
          rows={3}
          className="w-full bg-black text-gray-600 p-3 rounded-lg resize-none cursor-not-allowed"
        />
      </div>
    </div>
  )
}
