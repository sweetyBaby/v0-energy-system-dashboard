'use client'

import { useToast } from '@/hooks/use-toast'
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={2600}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid flex-1 gap-1.5 pr-2">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action ? <div className="mt-0.5 shrink-0">{action}</div> : null}
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
