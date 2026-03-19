# Web App Scaffold

This frontend is now a mock-data HTML MVP shell rendered from Node.

## Current behavior
- serves a designed Mission Control dashboard at `/`
- includes Overview stats, Office View, Sessions summary, Task Board, and Recent Events
- uses mock data shaped from the shared contracts

## Why it is still a scaffold
- it is not yet a real Next.js app
- no client-side routing yet
- no TanStack Query or websocket client yet
- no live OpenClaw data yet

## Next implementation steps
- replace the Node HTML renderer with a real Next.js app router project
- split the shell into reusable components
- fetch from the API layer instead of local mock data
- add websocket updates and real Office interactions
