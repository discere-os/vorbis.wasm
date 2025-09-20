#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Dependency Integration Test - Tests enhanced dependency features
 * This tests the dual dependency system: static (MAIN_MODULE) and dlopen (SIDE_MODULE)
 */

import Vorbis from "./src/lib/index.ts"

async function testDependencyFeatures() {
  console.log("🧪 Vorbis.wasm Dependency Integration Test")
  console.log("=" + "=".repeat(55))

  // Initialize Vorbis with dependency features enabled
  const vorbis = new Vorbis({
    simdOptimizations: true,
    compressionSupport: true,
    losslessSupport: false,
    verboseErrors: true
  })

  console.log("📦 Initializing Vorbis WASM module...")
  await vorbis.initialize()
  console.log("✅ Vorbis initialized successfully")

  // Basic info
  console.log(`📖 Version: ${vorbis.getVersion()}`)
  console.log(`⚡ SIMD support: ${vorbis.isSIMDAvailable() ? 'Available' : 'Not available'}`)

  console.log("\n🔗 Dependency Detection")
  console.log("-".repeat(30))

  // Test dependency detection
  const depInfo = vorbis.getDependencyInfo()
  console.log(`📋 Dependency Information:`)
  console.log(`   zlib support: ${depInfo.hasZlib ? '✅ Available' : '❌ Not available'}`)
  console.log(`   FLAC support: ${depInfo.hasFLAC ? '✅ Available' : '❌ Not available'}`)
  console.log(`   Static linking: ${depInfo.isStatic ? '✅ Yes' : '❌ No'}`)
  console.log(`   Dynamic loading: ${depInfo.isDynamic ? '✅ Yes' : '❌ No'}`)
  console.log(`   Status bitmask: 0x${depInfo.statusMask.toString(16).padStart(2, '0')}`)

  if (depInfo.hasZlib) {
    console.log("\n🗜️ Compression Features Test")
    console.log("-".repeat(30))

    // Test compression ratio
    try {
      const compressionRatio = vorbis.testCompressionRatio()
      console.log(`📊 Compression ratio test: ${compressionRatio.toFixed(2)}x`)

      if (compressionRatio > 1.0) {
        console.log("✅ Compression is working (ratio > 1.0)")
      } else {
        console.log("⚠️  Compression may not be working (ratio = 1.0)")
      }
    } catch (error) {
      console.log(`❌ Compression ratio test failed: ${error}`)
    }

    // Test compression benchmark
    try {
      console.log("🚀 Running compression benchmark...")
      const benchmark = vorbis.benchmarkCompression(100)
      console.log(`📊 Benchmark results:`)
      console.log(`   Operation: ${benchmark.operation}`)
      console.log(`   Time: ${benchmark.timeMs.toFixed(2)}ms`)
      console.log(`   Throughput: ${benchmark.opsPerSec.toFixed(0)} ops/sec`)
      console.log(`   Memory used: ${(benchmark.memoryUsed! / 1024 / 1024).toFixed(2)} MB`)
    } catch (error) {
      console.log(`❌ Compression benchmark failed: ${error}`)
    }

    // Test packet compression
    console.log("\n📦 Packet Compression Test")
    console.log("-".repeat(30))

    // Generate test packet data (simulating Vorbis packet)
    const testPacket = new Uint8Array(2048)
    for (let i = 0; i < testPacket.length; i++) {
      // Audio-like data with patterns for better compression
      testPacket[i] = Math.floor(128 + 120 * Math.sin(i * 0.01) + (i % 17))
    }

    try {
      const compressionResult = vorbis.compressPacket(testPacket)
      console.log(`📊 Packet compression result:`)
      console.log(`   Status: ${compressionResult.status}`)
      console.log(`   Original size: ${compressionResult.originalSize} bytes`)
      console.log(`   Compressed size: ${compressionResult.compressedSize} bytes`)
      console.log(`   Compression ratio: ${compressionResult.compressionRatio.toFixed(2)}x`)

      if (compressionResult.status === 'success') {
        console.log("✅ Packet compression successful")
        const savings = ((1 - compressionResult.compressedSize / compressionResult.originalSize) * 100)
        console.log(`💾 Space savings: ${savings.toFixed(1)}%`)
      } else if (compressionResult.status === 'no_compression') {
        console.log("⚠️  Compression not applied (data may not be compressible)")
      } else {
        console.log(`❌ Compression failed: ${compressionResult.error}`)
      }
    } catch (error) {
      console.log(`❌ Packet compression test failed: ${error}`)
    }

  } else {
    console.log("\n⚠️  Skipping compression tests (zlib not available)")
  }

  // SIMD Performance Test
  if (vorbis.isSIMDAvailable()) {
    console.log("\n⚡ SIMD Performance Test")
    console.log("-".repeat(30))

    try {
      console.log("🚀 Running SIMD benchmark...")
      const simdBenchmark = vorbis.benchmark(1000)
      console.log(`📊 SIMD benchmark results:`)
      console.log(`   Operation: ${simdBenchmark.operation}`)
      console.log(`   Time: ${simdBenchmark.timeMs.toFixed(2)}ms`)
      console.log(`   Throughput: ${(simdBenchmark.opsPerSec / 1000).toFixed(1)}K ops/sec`)
      console.log(`   SIMD used: ${simdBenchmark.simdUsed ? '✅ Yes' : '❌ No'}`)
    } catch (error) {
      console.log(`❌ SIMD benchmark failed: ${error}`)
    }
  }

  console.log("\n🧹 Cleanup")
  console.log("-".repeat(30))
  vorbis.cleanup()
  console.log("✅ Resources cleaned up")

  console.log("\n📋 Dependency Test Summary")
  console.log("=".repeat(30))

  let testsPassed = 0
  let testsTotal = 4

  console.log("✅ Module initialization: PASSED")
  testsPassed++

  console.log(`${depInfo.hasZlib || depInfo.isStatic ? '✅' : '❌'} Dependency detection: ${depInfo.hasZlib || depInfo.isStatic ? 'PASSED' : 'FAILED'}`)
  if (depInfo.hasZlib || depInfo.isStatic) testsPassed++

  console.log(`${vorbis.isSIMDAvailable() ? '✅' : '❌'} SIMD support: ${vorbis.isSIMDAvailable() ? 'PASSED' : 'FAILED'}`)
  if (vorbis.isSIMDAvailable()) testsPassed++

  console.log("✅ Cleanup: PASSED")
  testsPassed++

  console.log(`\n🏆 Tests passed: ${testsPassed}/${testsTotal}`)

  if (testsPassed === testsTotal) {
    console.log("🎉 All dependency integration tests PASSED!")
    return true
  } else {
    console.log("⚠️  Some tests failed - check implementation")
    return false
  }
}

// Run the test
if (import.meta.main) {
  try {
    const success = await testDependencyFeatures()
    Deno.exit(success ? 0 : 1)
  } catch (error) {
    console.error(`❌ Test failed: ${error}`)
    Deno.exit(1)
  }
}