"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { toastListeners, type State, type ToasterToast } from "@/hooks/use-toast"
import { useEffect, useState } from "react"

export function Toaster() {
  const [toasts, setToasts] = useState<ToasterToast[]>([])

  useEffect(() => {
    const updateToasts = (state: State) => {
      setToasts(state.toasts)
    }
    
    toastListeners.push(updateToasts)
    updateToasts({ toasts: [] })
    
    return () => {
      const index = toastListeners.indexOf(updateToasts)
      if (index > -1) {
        toastListeners.splice(index, 1)
      }
    }
  }, [])

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
