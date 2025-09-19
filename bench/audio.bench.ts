import Vorbis from "../src/lib/index.ts"
import type { VorbisEncodingOptions } from "../src/lib/types.ts"

let vorbis: Vorbis

// Setup before benchmarks
await (async () => {
  vorbis = new Vorbis({ simdOptimizations: true })
  await vorbis.initialize()
  console.log(`🎵 Vorbis ${vorbis.getVersion()} benchmarks`)
  console.log(`📊 SIMD support: ${vorbis.isSIMDAvailable() ? 'Available' : 'Not available'}`)
})()

Deno.bench("Vorbis encoder initialization (VBR)", () => {
  const options: VorbisEncodingOptions = {
    channels: 2,
    sampleRate: 44100,
    quality: 0.4
  }

  vorbis.initializeEncoder(options)
})

Deno.bench("Vorbis encoder initialization (CBR)", () => {
  const options: VorbisEncodingOptions = {
    channels: 2,
    sampleRate: 44100,
    bitrate: 128000,
    managed: true
  }

  vorbis.initializeEncoder(options)
})

Deno.bench("PCM encoding - 1024 samples stereo", () => {
  const encoder = vorbis.initializeEncoder({
    channels: 2,
    sampleRate: 44100,
    quality: 0.4
  })

  const samples = 1024
  const pcm = new Float32Array(samples * 2)

  // Generate test audio
  for (let i = 0; i < samples; i++) {
    const t = i / 44100
    const sample = Math.sin(2 * Math.PI * 440 * t) * 0.5

    pcm[i * 2] = sample
    pcm[i * 2 + 1] = sample
  }

  vorbis.encode(encoder, pcm, 2)
})

Deno.bench("PCM encoding - 4096 samples stereo", () => {
  const encoder = vorbis.initializeEncoder({
    channels: 2,
    sampleRate: 44100,
    quality: 0.4
  })

  const samples = 4096
  const pcm = new Float32Array(samples * 2)

  // Generate test audio with harmonics
  for (let i = 0; i < samples; i++) {
    const t = i / 44100
    const fundamental = Math.sin(2 * Math.PI * 440 * t) * 0.4
    const harmonic2 = Math.sin(2 * Math.PI * 880 * t) * 0.2
    const harmonic3 = Math.sin(2 * Math.PI * 1320 * t) * 0.1
    const sample = fundamental + harmonic2 + harmonic3

    pcm[i * 2] = sample
    pcm[i * 2 + 1] = sample * 0.8 // Slight stereo variation
  }

  vorbis.encode(encoder, pcm, 2)
})

Deno.bench("PCM encoding - mono vs stereo comparison", { group: "channels" }, () => {
  const encoder = vorbis.initializeEncoder({
    channels: 1,
    sampleRate: 44100,
    quality: 0.4
  })

  const samples = 2048
  const pcm = new Float32Array(samples)

  for (let i = 0; i < samples; i++) {
    const t = i / 44100
    pcm[i] = Math.sin(2 * Math.PI * 440 * t) * 0.5
  }

  vorbis.encode(encoder, pcm, 1)
})

Deno.bench("PCM encoding - stereo processing", { group: "channels" }, () => {
  const encoder = vorbis.initializeEncoder({
    channels: 2,
    sampleRate: 44100,
    quality: 0.4
  })

  const samples = 2048
  const pcm = new Float32Array(samples * 2)

  for (let i = 0; i < samples; i++) {
    const t = i / 44100
    pcm[i * 2] = Math.sin(2 * Math.PI * 440 * t) * 0.5
    pcm[i * 2 + 1] = Math.cos(2 * Math.PI * 440 * t) * 0.5
  }

  vorbis.encode(encoder, pcm, 2)
})

Deno.bench("Quality level comparison - low quality", { group: "quality" }, () => {
  const encoder = vorbis.initializeEncoder({
    channels: 2,
    sampleRate: 44100,
    quality: -1.0 // Low quality
  })

  const samples = 2048
  const pcm = new Float32Array(samples * 2)

  for (let i = 0; i < samples; i++) {
    const t = i / 44100
    const sample = Math.sin(2 * Math.PI * 440 * t) * 0.5
    pcm[i * 2] = sample
    pcm[i * 2 + 1] = sample
  }

  vorbis.encode(encoder, pcm, 2)
})

Deno.bench("Quality level comparison - high quality", { group: "quality" }, () => {
  const encoder = vorbis.initializeEncoder({
    channels: 2,
    sampleRate: 44100,
    quality: 1.0 // High quality
  })

  const samples = 2048
  const pcm = new Float32Array(samples * 2)

  for (let i = 0; i < samples; i++) {
    const t = i / 44100
    const sample = Math.sin(2 * Math.PI * 440 * t) * 0.5
    pcm[i * 2] = sample
    pcm[i * 2 + 1] = sample
  }

  vorbis.encode(encoder, pcm, 2)
})

Deno.bench("Sample rate comparison - 22kHz", { group: "samplerate" }, () => {
  const encoder = vorbis.initializeEncoder({
    channels: 2,
    sampleRate: 22050,
    quality: 0.4
  })

  const samples = 1024
  const pcm = new Float32Array(samples * 2)

  for (let i = 0; i < samples; i++) {
    const t = i / 22050
    const sample = Math.sin(2 * Math.PI * 440 * t) * 0.5
    pcm[i * 2] = sample
    pcm[i * 2 + 1] = sample
  }

  vorbis.encode(encoder, pcm, 2)
})

Deno.bench("Sample rate comparison - 44kHz", { group: "samplerate" }, () => {
  const encoder = vorbis.initializeEncoder({
    channels: 2,
    sampleRate: 44100,
    quality: 0.4
  })

  const samples = 1024
  const pcm = new Float32Array(samples * 2)

  for (let i = 0; i < samples; i++) {
    const t = i / 44100
    const sample = Math.sin(2 * Math.PI * 440 * t) * 0.5
    pcm[i * 2] = sample
    pcm[i * 2 + 1] = sample
  }

  vorbis.encode(encoder, pcm, 2)
})

Deno.bench("Memory usage during encoding", () => {
  const encoder = vorbis.initializeEncoder({
    channels: 2,
    sampleRate: 44100,
    quality: 0.4
  })

  const initialMemory = vorbis.getMemoryUsage()

  const samples = 4096
  const pcm = new Float32Array(samples * 2)

  for (let i = 0; i < samples; i++) {
    const t = i / 44100
    const sample = Math.sin(2 * Math.PI * 440 * t) * 0.5
    pcm[i * 2] = sample
    pcm[i * 2 + 1] = sample
  }

  vorbis.encode(encoder, pcm, 2)

  const finalMemory = vorbis.getMemoryUsage()
  const memoryDelta = finalMemory - initialMemory

  // Memory delta should be reasonable
  if (memoryDelta > 1024 * 1024) { // > 1MB growth
    console.warn(`High memory growth: ${memoryDelta / 1024 / 1024:.2f} MB`)
  }
})

// SIMD-specific benchmarks (only if SIMD is available)
if (vorbis.isSIMDAvailable()) {
  Deno.bench("SIMD audio processing benchmark", () => {
    vorbis.benchmark(100)
  })

  Deno.bench("Large buffer SIMD encoding", () => {
    const encoder = vorbis.initializeEncoder({
      channels: 2,
      sampleRate: 44100,
      quality: 0.4
    })

    // Large buffer to benefit from SIMD
    const samples = 16384
    const pcm = new Float32Array(samples * 2)

    // Complex waveform to stress SIMD operations
    for (let i = 0; i < samples; i++) {
      const t = i / 44100
      const left = Math.sin(2 * Math.PI * 440 * t) * 0.3 +
                   Math.sin(2 * Math.PI * 880 * t) * 0.2 +
                   Math.sin(2 * Math.PI * 1760 * t) * 0.1
      const right = Math.cos(2 * Math.PI * 440 * t) * 0.3 +
                    Math.cos(2 * Math.PI * 880 * t) * 0.2 +
                    Math.cos(2 * Math.PI * 1760 * t) * 0.1

      pcm[i * 2] = left
      pcm[i * 2 + 1] = right
    }

    vorbis.encode(encoder, pcm, 2)
  })
} else {
  console.log("⚠️  SIMD benchmarks skipped - not available on this platform")
}

// Cleanup after benchmarks
globalThis.addEventListener("unload", () => {
  vorbis?.cleanup()
})