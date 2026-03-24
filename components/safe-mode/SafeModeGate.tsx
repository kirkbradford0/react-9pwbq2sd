"use client"

import { useMemo } from "react"
import { computeFMScore, type FMScoreInputs } from "@/lib/safe-mode/score"
import SafeModePage from "./SafeModePage"

type Props = FMScoreInputs & {
  children: React.ReactNode
}

export default function SafeModeGate({ children, ...scoreInputs }: Props) {
  const { isSafeMode, score, reasons } = useMemo(
    () => computeFMScore(scoreInputs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(scoreInputs)]
  )

  if (!isSafeMode) return <>{children}</>

  return <SafeModePage score={score} reasons={reasons} />
}
