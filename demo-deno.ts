#!/usr/bin/env -S deno run --allow-read --allow-write

import Vorbis from "./src/lib/index.ts"
import type { VorbisEncodingOptions } from "./src/lib/types.ts"

async function demo() {
  console.log("🎵 @discere-os/vorbis.wasm Demo")
  console.log("=" + "=".repeat(50))

  // Initialize Vorbis with SIMD optimizations
  const vorbis = new Vorbis({
    simdOptimizations: true,
    maxMemoryMB: 128,
    verboseErrors: true
  })

  console.log("📦 Initializing Vorbis WASM module...")
  await vorbis.initialize()
  console.log("✅ Vorbis initialized successfully")

  // Display version and capabilities
  console.log(`📖 Version: ${vorbis.getVersion()}`)
  console.log(`⚡ SIMD support: ${vorbis.isSIMDAvailable() ? 'Available' : 'Not available'}`)
  console.log(`💾 Memory usage: ${(vorbis.getMemoryUsage() / 1024 / 1024).toFixed(2)} MB`)

  console.log("\n🎼 Encoding Demo")
  console.log("-".repeat(30))

  // Configure encoder for stereo 44.1kHz audio
  const encodingOptions: VorbisEncodingOptions = {
    channels: 2,
    sampleRate: 44100,
    quality: 0.4 // VBR quality ~128kbps equivalent
  }

  console.log(`🔧 Encoder configuration:`)
  console.log(`   Channels: ${encodingOptions.channels}`)
  console.log(`   Sample rate: ${encodingOptions.sampleRate} Hz`)
  console.log(`   Quality: ${encodingOptions.quality} (VBR)`)

  // Initialize encoder
  const encoder = vorbis.initializeEncoder(encodingOptions)
  console.log(`✅ Encoder initialized`)

  // Generate test audio - stereo sine waves with harmonics
  const duration = 1.0 // 1 second
  const sampleCount = Math.floor(encodingOptions.sampleRate * duration)
  const pcmStereo = new Float32Array(sampleCount * 2)

  console.log(`🎶 Generating ${duration}s of test audio (${sampleCount} samples per channel)`)

  for (let i = 0; i < sampleCount; i++) {
    const t = i / encodingOptions.sampleRate

    // Left channel: 440Hz + 880Hz harmonics
    const left = Math.sin(2 * Math.PI * 440 * t) * 0.4 +
                 Math.sin(2 * Math.PI * 880 * t) * 0.2 +
                 Math.sin(2 * Math.PI * 1320 * t) * 0.1

    // Right channel: 554Hz + 1108Hz (slightly detuned for stereo effect)
    const right = Math.sin(2 * Math.PI * 554 * t) * 0.4 +
                  Math.sin(2 * Math.PI * 1108 * t) * 0.2 +
                  Math.sin(2 * Math.PI * 1662 * t) * 0.1

    pcmStereo[i * 2] = left
    pcmStereo[i * 2 + 1] = right
  }

  // Encode PCM to Vorbis
  console.log("🔄 Encoding PCM to Vorbis...")
  const startTime = performance.now()

  const result = vorbis.encode(encoder, pcmStereo, encodingOptions.channels)
  const encodingTime = performance.now() - startTime

  console.log(`⏱️  Encoding time: ${encodingTime.toFixed(2)}ms`)

  if (result.status === 'success' && result.packet) {
    console.log(`📦 Encoded packet:`)
    console.log(`   Size: ${result.packet.data.length} bytes`)
    console.log(`   Granule position: ${result.packet.granulepos}`)
    console.log(`   Packet number: ${result.packet.packetno}`)
    console.log(`   Beginning of stream: ${result.packet.b_o_s}`)
    console.log(`   End of stream: ${result.packet.e_o_s}`)

    // Calculate compression ratio
    const originalSize = pcmStereo.length * 4 // 32-bit floats
    const compressedSize = result.packet.data.length
    const compressionRatio = originalSize / compressedSize

    console.log(`📊 Compression analysis:`)
    console.log(`   Original PCM: ${originalSize} bytes`)
    console.log(`   Compressed: ${compressedSize} bytes`)
    console.log(`   Ratio: ${compressionRatio.toFixed(2)}:1`)
  } else if (result.status === 'need_more_data') {
    console.log("⏳ Encoder needs more data to produce a packet")
  } else {
    console.error(`❌ Encoding error: ${result.error}`)
  }

  // Performance benchmarks
  if (vorbis.isSIMDAvailable()) {
    console.log("\n⚡ SIMD Performance Benchmarks")
    console.log("-".repeat(35))

    const benchmarkIterations = 1000
    console.log(`🏃 Running ${benchmarkIterations} iterations...`)

    const benchResult = vorbis.benchmark(benchmarkIterations)

    console.log(`📈 Results:`)
    console.log(`   Operation: ${benchResult.operation}`)
    console.log(`   Time: ${benchResult.timeMs.toFixed(2)}ms`)
    console.log(`   Throughput: ${benchResult.opsPerSec.toLocaleString()} ops/sec`)
    console.log(`   SIMD used: ${benchResult.simdUsed}`)
    if (benchResult.memoryUsed) {
      console.log(`   Memory: ${(benchResult.memoryUsed / 1024 / 1024).toFixed(2)} MB`)
    }
  } else {
    console.log("\n⚠️  SIMD benchmarks not available on this platform")
  }

  // Audio processing throughput calculation
  const audioDataSize = pcmStereo.length * 4 // bytes
  const throughputMBps = audioDataSize / (encodingTime / 1000) / 1024 / 1024

  console.log("\n📊 Processing Statistics")
  console.log("-".repeat(30))
  console.log(`🔢 Samples processed: ${sampleCount.toLocaleString()} per channel`)
  console.log(`💿 Audio data size: ${(audioDataSize / 1024 / 1024).toFixed(2)} MB`)
  console.log(`⚡ Processing speed: ${throughputMBps.toFixed(2)} MB/s`)
  console.log(`🎯 Real-time factor: ${(duration * 1000 / encodingTime).toFixed(1)}x`)

  // Log analysis
  const logEntries = vorbis.getLogEntries()
  if (logEntries.length > 0) {
    console.log("\n📝 Log Entries")
    console.log("-".repeat(20))
    logEntries.slice(-5).forEach(entry => {
      const timestamp = new Date(entry.timestamp).toLocaleTimeString()
      console.log(`[${timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`)
    })
  }

  // Memory usage analysis
  const finalMemory = vorbis.getMemoryUsage()
  console.log("\n💾 Memory Analysis")
  console.log("-".repeat(25))
  console.log(`Final usage: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`)
  console.log(`Limit: ${vorbis.options.maxMemoryMB} MB`)
  console.log(`Utilization: ${(finalMemory / (vorbis.options.maxMemoryMB! * 1024 * 1024) * 100).toFixed(1)}%`)

  // Cleanup
  console.log("\n🧹 Cleanup")
  console.log("-".repeat(15))
  vorbis.cleanup()
  console.log("✅ Resources cleaned up")

  console.log("\n🎉 Demo completed successfully!")
  console.log("\n📋 Summary:")
  console.log(`   • Encoded ${duration}s of stereo audio`)
  console.log(`   • Processing speed: ${throughputMBps.toFixed(2)} MB/s`)
  console.log(`   • SIMD support: ${vorbis.isSIMDAvailable() ? 'Available' : 'Not available'}`)
  console.log(`   • Memory efficient: ${(finalMemory / 1024 / 1024).toFixed(2)} MB used`)
}

if (import.meta.main) {
  try {
    await demo()
  } catch (error) {
    console.error("❌ Demo failed:", error)
    Deno.exit(1)
  }
}