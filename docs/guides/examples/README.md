# Debug Component Examples

This directory contains example components demonstrating how to use the debug system.

## Example Components

### `DebugExample.tsx`
Simple example showing basic debug logging usage with the `simpleDebug` library.

**Features:**
- Component lifecycle logging (mount/unmount/updates)
- Button click event logging
- Error simulation and logging
- Demonstrates `debug.info()` and `debug.error()` usage

### `ViteSafeDebugExample.tsx`
Advanced example demonstrating the Vite-safe debug system with SSR protection.

**Features:**
- Vite/SSR-safe debug logging with `debugHelpers`
- Component lifecycle tracking
- Performance monitoring with `perfLog.timer()`
- Conditional function execution
- Scoped logging (component, test-flow, user)
- Error capture with full context

## Usage

These examples are for reference only. They demonstrate debug system integration patterns but should not be used directly in production code.

## Active Debug System

The app currently uses `simpleDebug` (`src/lib/simpleDebug.ts`) with `SimpleDebugToggle` component (`src/components/SimpleDebugToggle.tsx`).

For integration examples, see:
- `src/App.tsx` - Basic debug initialization
- `src/lib/api.ts` - API call logging
- `src/components/pages/CharactersPage.tsx` - Component-level logging

---

**Note**: `DebugPanel.tsx` and `DebugToggle.tsx` are deprecated and use the unused `debugCollector` system. They are kept for reference only.

