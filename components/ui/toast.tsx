'use client'

import * as React from 'react'
import * as ToastPrimitives from '@radix-ui/react-toast'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed inset-x-4 top-4 z-[100] flex max-h-screen max-w-[calc(100vw-2rem)] flex-col gap-3 outline-none sm:left-auto sm:right-6 sm:top-6 sm:max-w-[420px]',
      className,
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-start gap-4 overflow-hidden rounded-[22px] border p-5 text-[#ECF7FF] shadow-[0_20px_50px_rgba(3,8,20,0.45),0_0_0_1px_rgba(148,163,184,0.05)_inset] backdrop-blur-xl transition-all before:absolute before:bottom-4 before:left-0 before:top-4 before:w-px before:bg-gradient-to-b before:from-transparent before:via-cyan-300/80 before:to-transparent data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-4',
  {
    variants: {
      variant: {
        default:
          'border-white/10 bg-[linear-gradient(180deg,rgba(7,17,34,0.96),rgba(4,9,20,0.94))]',
        destructive:
          'destructive border-[#ff6b7d]/35 bg-[linear-gradient(180deg,rgba(58,10,20,0.97),rgba(28,8,14,0.96))] text-[#FFF2F4] before:via-[#ff90a1]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/6 px-4 text-sm font-medium text-white/84 ring-offset-background transition-colors hover:bg-white/12 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/60 focus:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-[#ff9cac]/30 group-[.destructive]:bg-white/8 group-[.destructive]:hover:border-[#ffb3be]/40 group-[.destructive]:hover:bg-white/14 group-[.destructive]:focus:ring-[#ff9cac]/45',
      className,
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'absolute right-3 top-3 rounded-full border border-white/10 bg-white/5 p-1.5 text-white/46 opacity-100 transition-colors hover:bg-white/10 hover:text-white/88 focus:outline-none focus:ring-2 focus:ring-cyan-300/60 group-[.destructive]:border-white/10 group-[.destructive]:text-[#ffb6c0] group-[.destructive]:hover:bg-white/10 group-[.destructive]:hover:text-white group-[.destructive]:focus:ring-[#ff9cac]/45',
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('text-[15px] font-semibold leading-5 tracking-[0.02em]', className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('text-[13px] leading-5 text-[#9FB4D6]', className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
