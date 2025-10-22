import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { getActivity } from '@/lib/get-activity'
import { cn } from '@/lib/utils'

export function Activity({ initial }: { initial: string }) {
  const [activity, setActivity] = useState(initial)
  const fetchActivity = useServerFn(getActivity)

  useEffect(() => {
    const interval = setInterval(async () => {
      const activity = await fetchActivity()
      setActivity(activity)
    }, 10 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  const isBroken = activity.startsWith('oops')

  return (
    <div className="flex items-center gap-2 hover:animate-pulse">
      <span className="">now: </span>
      <button
        className={cn({
          'hover:text-cyber-pink cursor-pointer underline': isBroken,
        })}
        onClick={async () => {
          if (!isBroken) return
          await fetch('/api/notify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message:
                'whatmedoin API returned un-tracked activity. Update frixaco.com to handle it.',
            }),
          })
        }}
      >
        {activity}
      </button>
    </div>
  )
}
