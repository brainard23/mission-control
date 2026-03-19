# Mission Control Wireframes v1

Following the frontend-design approach: layout first, then theme/motion.

## 1. Global app shell

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Mission Control                     Search...          Filters   Settings    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Overview | Office | Sessions | Tasks | Events | Infra                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Main content area                                                           │
│                                                                              │
│                                                         Right-side drawer    │
│                                                         (details/actions)    │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 2. Overview

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Stats Strip                                                                  │
│ [Active Agents] [Active Sessions] [In Progress] [Blocked] [Failed] [Stale]  │
├───────────────────────────────┬──────────────────────────────────────────────┤
│ Attention Needed              │ Recent Activity                              │
│ - blocked task                │ - event                                      │
│ - stale session               │ - event                                      │
│ - degraded health             │ - event                                      │
├───────────────────────────────┼──────────────────────────────────────────────┤
│ Health Summary                │ Active Agents Snapshot                       │
│ gateway / backend / nodes     │ [agent card][agent card][agent card]         │
└───────────────────────────────┴──────────────────────────────────────────────┘
```

## 3. Office View

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Office Filters: [Room] [Status] [Type] [Search]                             │
├──────────────────────────────────────────────────────────────────────────────┤
│ Engineering Room                                                             │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐            │
│  │ Reviewer         │  │ Builder          │  │ Browser Agent    │            │
│  │ working          │  │ blocked          │  │ waiting          │            │
│  │ Review PR #123   │  │ Fix auth issue   │  │ Awaiting login   │            │
│  │ 02m ago          │  │ blocker badge    │  │ 14s ago          │            │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘            │
│                                                                              │
│ Automation Bay                                                               │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                                  │
│  │ Cron Runner      │  │ Infra Watch      │                                  │
│  │ idle             │  │ working          │                                  │
│  │ next run 12m     │  │ Node health      │                                  │
│  └──────────────────┘  └──────────────────┘                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│ Activity Rail                          │ Detail Drawer                        │
│ - latest event                         │ selected agent/session/task          │
│ - latest event                         │ actions + event context              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 4. Sessions view

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Sessions                                                                     │
├───────────────────────────────────────┬──────────────────────────────────────┤
│ Session list                          │ Session detail                       │
│ [sess_1][active][claude]              │ label, runtime, model               │
│ [sess_2][paused][gpt]                 │ linked agent                        │
│ [sess_3][failed][acp]                 │ linked task                         │
│                                       │ recent events                       │
│                                       │ actions: message / stop             │
└───────────────────────────────────────┴──────────────────────────────────────┘
```

## 5. Tasks view

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Tasks                                                                        │
├──────────────┬──────────────┬──────────────┬──────────────┬──────────────────┤
│ Queued       │ In Progress  │ Waiting      │ Blocked      │ Done             │
│ [task]       │ [task]       │ [task]       │ [task]       │ [task]           │
│ [task]       │ [task]       │              │              │                  │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────────┘
```

## 6. UI design notes

### Theme direction
- dark ops dashboard
- graphite background
- elevated charcoal panels
- cyan/blue for active work
- amber for waiting
- red for blocked/failed
- green for recent success

### Motion
- subtle pulse for working state
- no animation for idle
- gentle highlight flash on state change
- keep movement sparse and meaningful

### Typography
- Inter or DM Sans for UI
- JetBrains Mono for IDs, timestamps, technical metadata
