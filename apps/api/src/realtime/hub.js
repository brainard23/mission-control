const subscribers = new Set()

export function publishRealtime(message) {
  for (const subscriber of subscribers) {
    try {
      subscriber(message)
    } catch {
      // ignore subscriber failures so one bad socket does not break the hub
    }
  }
}

export function subscribeRealtime(handler) {
  subscribers.add(handler)
  return () => {
    subscribers.delete(handler)
  }
}
