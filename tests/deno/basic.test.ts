import { assert, assertEquals, assertExists } from "@std/assert"
import Vorbis from "../../src/lib/index.ts"

Deno.test("Vorbis library initialization", async () => {
  const vorbis = new Vorbis()
  await vorbis.initialize()
  assertExists(vorbis)
  assert(vorbis.isInitialized())
  vorbis.cleanup()
})

Deno.test("Vorbis version string", async () => {
  const vorbis = new Vorbis()
  await vorbis.initialize()

  const version = vorbis.getVersion()
  assertExists(version)
  assert(version.includes("libvorbis"))

  vorbis.cleanup()
})

Deno.test("SIMD availability detection", async () => {
  const vorbis = new Vorbis({ simdOptimizations: true })
  await vorbis.initialize()

  // SIMD availability is platform dependent
  const hasSIMD = vorbis.isSIMDAvailable()
  assert(typeof hasSIMD === "boolean")

  vorbis.cleanup()
})

Deno.test("Memory usage tracking", async () => {
  const vorbis = new Vorbis({ maxMemoryMB: 128 })
  await vorbis.initialize()

  const memoryUsage = vorbis.getMemoryUsage()
  assert(memoryUsage > 0)
  assert(memoryUsage < 128 * 1024 * 1024) // Less than max

  vorbis.cleanup()
})

Deno.test("Logging functionality", async () => {
  const vorbis = new Vorbis({ verboseErrors: true })
  await vorbis.initialize()

  const logEntries = vorbis.getLogEntries()
  assert(Array.isArray(logEntries))
  assert(logEntries.length > 0)

  // Clear logs
  vorbis.clearLogEntries()
  assertEquals(vorbis.getLogEntries().length, 0)

  vorbis.cleanup()
})

Deno.test("Error handling for uninitialized library", () => {
  const vorbis = new Vorbis()

  try {
    vorbis.getVersion()
    assert(false, "Should have thrown error for uninitialized library")
  } catch (error) {
    assert(error.message.includes("not initialized"))
  }
})

Deno.test("Options configuration", async () => {
  const options = {
    simdOptimizations: false,
    maxMemoryMB: 64,
    verboseErrors: true
  }

  const vorbis = new Vorbis(options)
  await vorbis.initialize()

  // Verify SIMD is disabled when requested
  assertEquals(vorbis.isSIMDAvailable(), false)

  vorbis.cleanup()
})

Deno.test("Cleanup and reinitialization", async () => {
  const vorbis = new Vorbis()

  // First initialization
  await vorbis.initialize()
  assert(vorbis.isInitialized())

  // Cleanup
  vorbis.cleanup()
  assert(!vorbis.isInitialized())

  // Reinitialization should work
  await vorbis.initialize()
  assert(vorbis.isInitialized())

  vorbis.cleanup()
})