import { assert, assertEquals, assertExists } from "@std/assert"
import Vorbis from "../../src/lib/index.ts"

Deno.test("SIMD availability detection", async () => {
  const vorbis = new Vorbis({ simdOptimizations: true })
  await vorbis.initialize()

  const simdAvailable = vorbis.isSIMDAvailable()
  assert(typeof simdAvailable === "boolean")

  console.log(`SIMD support: ${simdAvailable ? 'Available' : 'Not available'}`)

  vorbis.cleanup()
})

Deno.test("SIMD benchmarking", async () => {
  const vorbis = new Vorbis({ simdOptimizations: true })
  await vorbis.initialize()

  if (!vorbis.isSIMDAvailable()) {
    console.log("Skipping SIMD benchmarks - not available on this platform")
    vorbis.cleanup()
    return
  }

  const result = vorbis.benchmark(1000)

  assertExists(result)
  assertEquals(result.operation, "SIMD Audio Processing")
  assert(result.timeMs > 0)
  assert(result.opsPerSec > 0)
  assertEquals(result.simdUsed, true)
  assert(result.memoryUsed && result.memoryUsed > 0)

  console.log(`SIMD Benchmark Results:`)
  console.log(`  Time: ${result.timeMs.toFixed(2)}ms`)
  console.log(`  Throughput: ${result.opsPerSec.toLocaleString()} ops/sec`)
  console.log(`  Memory: ${(result.memoryUsed! / 1024 / 1024).toFixed(2)} MB`)

  vorbis.cleanup()
})

Deno.test("SIMD vs non-SIMD performance", async () => {
  // Test with SIMD enabled
  const vorbisWithSIMD = new Vorbis({ simdOptimizations: true })
  await vorbisWithSIMD.initialize()

  // Test without SIMD
  const vorbisNoSIMD = new Vorbis({ simdOptimizations: false })
  await vorbisNoSIMD.initialize()

  const iterations = 500

  let simdResult
  if (vorbisWithSIMD.isSIMDAvailable()) {
    simdResult = vorbisWithSIMD.benchmark(iterations)
    console.log(`With SIMD: ${simdResult.opsPerSec.toLocaleString()} ops/sec`)
  } else {
    console.log("SIMD not available - skipping comparison")
  }

  // Both should work regardless of SIMD availability
  assert(vorbisWithSIMD.isInitialized())
  assert(vorbisNoSIMD.isInitialized())

  vorbisWithSIMD.cleanup()
  vorbisNoSIMD.cleanup()
})

Deno.test("SIMD encoding performance", async () => {
  const vorbis = new Vorbis({ simdOptimizations: true })
  await vorbis.initialize()

  if (!vorbis.isSIMDAvailable()) {
    console.log("Skipping SIMD encoding test - not available")
    vorbis.cleanup()
    return
  }

  const encoder = vorbis.initializeEncoder({
    channels: 2,
    sampleRate: 44100,
    quality: 0.4
  })

  // Generate larger audio buffer for SIMD benefits
  const sampleCount = 44100 // 1 second of stereo audio
  const pcm = new Float32Array(sampleCount * 2)

  // Generate complex waveform to stress SIMD operations
  for (let i = 0; i < sampleCount; i++) {
    const t = i / 44100
    const left = Math.sin(2 * Math.PI * 440 * t) * 0.3 +
                 Math.sin(2 * Math.PI * 880 * t) * 0.2
    const right = Math.cos(2 * Math.PI * 440 * t) * 0.3 +
                  Math.cos(2 * Math.PI * 880 * t) * 0.2

    pcm[i * 2] = left
    pcm[i * 2 + 1] = right
  }

  const startTime = performance.now()
  const result = vorbis.encode(encoder, pcm, 2)
  const endTime = performance.now()

  const processingTime = endTime - startTime
  const throughput = (pcm.length * 4) / (processingTime / 1000) // bytes/sec

  console.log(`SIMD Encoding Performance:`)
  console.log(`  Processing time: ${processingTime.toFixed(2)}ms`)
  console.log(`  Throughput: ${(throughput / 1024 / 1024).toFixed(2)} MB/s`)

  assert(result.status === 'success' || result.status === 'need_more_data')
  assert(processingTime > 0)

  vorbis.cleanup()
})

Deno.test("SIMD optimization configuration", async () => {
  // Test that SIMD can be disabled
  const vorbisNoSIMD = new Vorbis({ simdOptimizations: false })
  await vorbisNoSIMD.initialize()

  // Should be initialized but not report SIMD as available
  assert(vorbisNoSIMD.isInitialized())
  assertEquals(vorbisNoSIMD.isSIMDAvailable(), false)

  vorbisNoSIMD.cleanup()

  // Test that SIMD can be enabled
  const vorbisWithSIMD = new Vorbis({ simdOptimizations: true })
  await vorbisWithSIMD.initialize()

  assert(vorbisWithSIMD.isInitialized())
  // Actual SIMD availability depends on platform
  const hasSIMD = vorbisWithSIMD.isSIMDAvailable()
  assert(typeof hasSIMD === "boolean")

  vorbisWithSIMD.cleanup()
})

Deno.test("SIMD memory alignment", async () => {
  const vorbis = new Vorbis({ simdOptimizations: true })
  await vorbis.initialize()

  if (!vorbis.isSIMDAvailable()) {
    console.log("Skipping SIMD memory alignment test - not available")
    vorbis.cleanup()
    return
  }

  // Test encoding with various buffer sizes to stress SIMD alignment
  const bufferSizes = [64, 128, 256, 512, 1024, 2048, 4096]

  const encoder = vorbis.initializeEncoder({
    channels: 1,
    sampleRate: 22050,
    quality: 0.5
  })

  for (const size of bufferSizes) {
    const pcm = new Float32Array(size)

    // Fill with test pattern
    for (let i = 0; i < size; i++) {
      pcm[i] = Math.sin(2 * Math.PI * i / size) * 0.5
    }

    const result = vorbis.encode(encoder, pcm, 1)

    // Should handle all buffer sizes without errors
    assert(result.status !== 'error', `Error with buffer size ${size}: ${result.error}`)
  }

  console.log(`Successfully tested SIMD with buffer sizes: ${bufferSizes.join(', ')}`)

  vorbis.cleanup()
})

Deno.test("SIMD error handling", async () => {
  const vorbis = new Vorbis({ simdOptimizations: true })
  await vorbis.initialize()

  if (!vorbis.isSIMDAvailable()) {
    console.log("Skipping SIMD error handling test - not available")
    vorbis.cleanup()
    return
  }

  // Test benchmark with invalid iterations
  try {
    vorbis.benchmark(-1)
    assert(false, "Should have thrown error for negative iterations")
  } catch (error) {
    // Expected error for invalid input
    assert(error.message.includes("SIMD") || error.message.includes("benchmark"))
  }

  vorbis.cleanup()
})