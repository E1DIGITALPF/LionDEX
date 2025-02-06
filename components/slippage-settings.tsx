import { Input } from "@/components/ui/input"
import { InfoIcon, AlertTriangle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SlippageSettingsProps {
  slippage: number;
  onSlippageChange: (value: number) => void;
}

export function SlippageSettings({ slippage, onSlippageChange }: SlippageSettingsProps) {
  const presets = [0.5, 1.0, 3.0]

  const handleSlippageChange = (value: number) => {
    const clampedValue = Math.min(Math.max(value, 0.1), 50)
    onSlippageChange(clampedValue)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-400">Slippage tolerance</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <InfoIcon className="h-3.5 w-3.5 text-zinc-500" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[250px] text-xs">
              <p>
                The maximum percentage variation in price you accept.
                A higher value increases the chances of the swap being successful,
                but you may receive fewer tokens.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5">
          {presets.map((value) => (
            <button
              key={value}
              onClick={() => handleSlippageChange(value)}
              className={`slippage-button ${
                slippage === value 
                  ? 'slippage-button-active' 
                  : 'slippage-button-inactive'
              }`}
            >
              {value}%
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={slippage}
            onChange={(e) => handleSlippageChange(Number(e.target.value))}
            className="slippage-input"
            min={0.1}
            max={50}
            step={0.1}
            placeholder="Custom"
          />
          <span className="text-xs text-zinc-400">%</span>
        </div>
      </div>

      {slippage > 5 && (
        <div className="slippage-warning">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>High risk of slippage</span>
        </div>
      )}
    </div>
  )
}