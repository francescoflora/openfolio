import { describe, expect, it } from 'vitest'
import {
  getDefaultAppSize,
  getStartWindowSize,
  START_WINDOW_WIDTH,
  START_WINDOW_HEIGHT_NO_RECENTS,
  applyStartWindowSize,
  applyDefaultAppSize,
} from './windowSize'

describe('windowSize', () => {
  it('calculates start window dimensions matching splash screen (640x400)', () => {
    const size = getStartWindowSize()
    expect(size.width).toBe(640)
    expect(size.height).toBe(400)
    expect(START_WINDOW_WIDTH).toBe(640)
    expect(START_WINDOW_HEIGHT_NO_RECENTS).toBe(400)
  })

  it('calculates default app size within valid bounds', () => {
    const size = getDefaultAppSize()
    expect(size.width).toBeGreaterThanOrEqual(960)
    expect(size.width).toBeLessThanOrEqual(1360)
    expect(size.height).toBeGreaterThanOrEqual(620)
    expect(size.height).toBeLessThanOrEqual(860)
  })

  it('gracefully no-ops in non-Tauri environment', async () => {
    await expect(applyStartWindowSize()).resolves.toBeUndefined()
    await expect(applyDefaultAppSize()).resolves.toBeUndefined()
  })
})
