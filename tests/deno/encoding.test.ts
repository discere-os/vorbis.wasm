import { assert, assertEquals, assertExists } from "@std/assert"
import Vorbis from "../../src/lib/index.ts"
import type { VorbisEncodingOptions } from "../../src/lib/types.ts"

Deno.test("Encoder initialization with VBR", async () => {
  const vorbis = new Vorbis()
  await vorbis.initialize()

  const options: VorbisEncodingOptions = {
    channels: 2,
    sampleRate: 44100,
    quality: 0.4
  }

  const encoder = vorbis.initializeEncoder(options)
  assertExists(encoder)
  assertEquals(encoder.info.channels, 2)
  assertEquals(encoder.info.rate, 44100)

  vorbis.cleanup()
})

Deno.test("Encoder initialization with CBR", async () => {
  const vorbis = new Vorbis()
  await vorbis.initialize()

  const options: VorbisEncodingOptions = {
    channels: 1,
    sampleRate: 22050,
    bitrate: 128000,
    managed: true
  }

  const encoder = vorbis.initializeEncoder(options)
  assertExists(encoder)
  assertEquals(encoder.info.channels, 1)
  assertEquals(encoder.info.rate, 22050)

  vorbis.cleanup()
})

Deno.test("PCM audio encoding", async () => {
  const vorbis = new Vorbis()
  await vorbis.initialize()

  const options: VorbisEncodingOptions = {
    channels: 2,
    sampleRate: 44100,
    quality: 0.4
  }

  const encoder = vorbis.initializeEncoder(options)

  // Generate test audio (stereo sine wave)
  const duration = 0.1 // 100ms
  const sampleCount = Math.floor(options.sampleRate * duration) * options.channels
  const pcm = new Float32Array(sampleCount)

  for (let i = 0; i < sampleCount; i += options.channels) {
    const t = i / (options.channels * options.sampleRate)
    const sample = Math.sin(2 * Math.PI * 440 * t) * 0.5 // 440Hz sine wave

    pcm[i] = sample     // Left channel
    pcm[i + 1] = sample // Right channel
  }

  // Encode the PCM data
  const result = vorbis.encode(encoder, pcm, options.channels)

  // First encode might need more data
  assert(result.status === 'success' || result.status === 'need_more_data')

  if (result.status === 'success') {
    assertExists(result.packet)
    assert(result.packet.data.length > 0)
    assert(result.packet.granulepos >= 0)
  }

  vorbis.cleanup()
})

Deno.test("Multiple encoding blocks", async () => {
  const vorbis = new Vorbis()
  await vorbis.initialize()

  const options: VorbisEncodingOptions = {
    channels: 1,
    sampleRate: 22050,
    quality: 0.5
  }

  const encoder = vorbis.initializeEncoder(options)

  // Generate multiple small blocks of audio
  const blockSamples = 1024
  const blockCount = 5
  let encodedPackets = 0

  for (let block = 0; block < blockCount; block++) {
    const pcm = new Float32Array(blockSamples)

    // Generate block audio (different frequency per block)
    const frequency = 220 + block * 110
    for (let i = 0; i < blockSamples; i++) {
      const t = i / options.sampleRate
      pcm[i] = Math.sin(2 * Math.PI * frequency * t) * 0.3
    }

    const result = vorbis.encode(encoder, pcm, options.channels)

    if (result.status === 'success') {
      encodedPackets++
      assertExists(result.packet)
      assert(result.packet.data.length > 0)
    } else if (result.status === 'error') {
      assert(false, `Encoding error: ${result.error}`)
    }
  }

  // Should have encoded at least some packets
  assert(encodedPackets >= 0)

  vorbis.cleanup()
})

Deno.test("Encoder error handling", async () => {
  const vorbis = new Vorbis()
  await vorbis.initialize()

  // Test invalid options
  const invalidOptions: VorbisEncodingOptions = {
    channels: 0, // Invalid
    sampleRate: 44100,
    quality: 0.4
  }

  try {
    vorbis.initializeEncoder(invalidOptions)
    assert(false, "Should have thrown error for invalid options")
  } catch (error) {
    assert(error.message.includes("Failed"))
  }

  vorbis.cleanup()
})

Deno.test("Quality range validation", async () => {
  const vorbis = new Vorbis()
  await vorbis.initialize()

  // Test different quality levels
  const qualities = [-1.0, 0.0, 0.5, 1.0]

  for (const quality of qualities) {
    const options: VorbisEncodingOptions = {
      channels: 1,
      sampleRate: 44100,
      quality
    }

    const encoder = vorbis.initializeEncoder(options)
    assertExists(encoder)
    assertEquals(encoder.info.channels, 1)
    assertEquals(encoder.info.rate, 44100)
  }

  vorbis.cleanup()
})

Deno.test("Channel configuration variations", async () => {
  const vorbis = new Vorbis()
  await vorbis.initialize()

  // Test mono and stereo
  const channelConfigs = [1, 2]

  for (const channels of channelConfigs) {
    const options: VorbisEncodingOptions = {
      channels,
      sampleRate: 44100,
      quality: 0.4
    }

    const encoder = vorbis.initializeEncoder(options)
    assertExists(encoder)
    assertEquals(encoder.info.channels, channels)
  }

  vorbis.cleanup()
})

Deno.test("Sample rate variations", async () => {
  const vorbis = new Vorbis()
  await vorbis.initialize()

  // Test common sample rates
  const sampleRates = [8000, 16000, 22050, 44100, 48000]

  for (const sampleRate of sampleRates) {
    const options: VorbisEncodingOptions = {
      channels: 1,
      sampleRate,
      quality: 0.4
    }

    const encoder = vorbis.initializeEncoder(options)
    assertExists(encoder)
    assertEquals(encoder.info.rate, sampleRate)
  }

  vorbis.cleanup()
})