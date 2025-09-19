#!/usr/bin/env -S deno run --allow-read --allow-write

import Vorbis from "./src/lib/index.ts"

async function simpleDemo() {
  console.log("🎵 Simple Vorbis Demo")
  console.log("=" + "=".repeat(30))

  // Initialize with basic settings
  const vorbis = new Vorbis({
    simdOptimizations: true,
    maxMemoryMB: 64,
    verboseErrors: true
  })

  console.log("📦 Initializing Vorbis...")
  await vorbis.initialize()
  console.log("✅ Initialized successfully")

  // Test basic info
  console.log(`📖 Version: ${vorbis.getVersion()}`)
  console.log(`⚡ SIMD: ${vorbis.isSIMDAvailable() ? 'Yes' : 'No'}`)
  console.log(`💾 Memory: ${(vorbis.getMemoryUsage() / 1024 / 1024).toFixed(2)} MB`)

  // Test SIMD benchmark if available
  if (vorbis.isSIMDAvailable()) {
    console.log("\n🚀 Running SIMD benchmark...")
    try {
      const result = vorbis.benchmark(100)
      console.log(`   Time: ${result.timeMs.toFixed(2)}ms`)
      console.log(`   Ops/sec: ${result.opsPerSec.toLocaleString()}`)
    } catch (error) {
      console.log(`   Error: ${error}`)
    }
  }

  // Show log entries
  const logs = vorbis.getLogEntries()
  console.log(`\n📝 Log entries: ${logs.length}`)

  // Cleanup
  vorbis.cleanup()
  console.log("✅ Demo completed!")
}

if (import.meta.main) {
  try {
    await simpleDemo()
  } catch (error) {
    console.error("❌ Demo failed:", error)
    Deno.exit(1)
  }
}