/**
 * WebAssembly port of libvorbis - Ogg Vorbis audio encoding and decoding library
 * Copyright (c) 2002-2020 Xiph.org Foundation
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under BSD-3-Clause
 */

import type {
  VorbisOptions,
  VorbisInfo,
  VorbisComment,
  VorbisEncodingOptions,
  VorbisDecodingResult,
  VorbisEncodingResult,
  VorbisPacket,
  VorbisAnalysisState,
  VorbisSynthesisState,
  VorbisBlock,
  VorbisBenchmarkResult,
  VorbisFileInfo,
  VorbisLogLevel,
  VorbisLogEntry
} from './types.ts'

export default class Vorbis {
  private module: any = null
  private initialized = false
  private logEntries: VorbisLogEntry[] = []

  constructor(private options: VorbisOptions = {}) {
    this.options = {
      simdOptimizations: true,
      maxMemoryMB: 256,
      verboseErrors: false,
      ...options
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      const wasmBinary = await this.loadWasmBinary()
      const moduleFactory = await this.loadModuleFactory()

      this.module = await moduleFactory({
        wasmBinary,
        onRuntimeInitialized: () => {
          this.log('info', 'Vorbis WASM module initialized')
        },
        print: (text: string) => this.log('info', `Vorbis: ${text}`),
        printErr: (text: string) => this.log('error', `Vorbis Error: ${text}`),
        locateFile: (path: string) => {
          if (path.endsWith('.wasm')) {
            return new URL('../../install/wasm/' + path, import.meta.url).href
          }
          return path
        }
      })

      // Setup wrapped functions
      this.setupBindings()
      this.initialized = true

      // Check SIMD availability
      if (this.options.simdOptimizations && this.isSIMDAvailable()) {
        this.log('info', 'SIMD optimizations enabled')
      }

    } catch (error) {
      throw new Error(`Failed to initialize Vorbis: ${error}`)
    }
  }

  private async loadWasmBinary(): Promise<ArrayBuffer | undefined> {
    // Deno-first development environment
    if (typeof globalThis.Deno !== 'undefined') {
      try {
        const wasmPath = new URL('../../install/wasm/vorbis-main.wasm', import.meta.url).pathname
        const wasmBuffer = await Deno.readFile(wasmPath)
        return wasmBuffer.buffer
      } catch (error) {
        this.log('warn', `Failed to load local WASM binary: ${error}`)
        return undefined
      }
    }

    // Web/CDN runtime - try CDN locations
    const cdnUrls = [
      'https://wasm.discere.cloud/vorbis/latest/main/',
      'https://cdn.jsdelivr.net/npm/@discere-os/vorbis.wasm/dist/'
    ]

    for (const url of cdnUrls) {
      try {
        const response = await fetch(`${url}vorbis-main.wasm`)
        if (response.ok) {
          return await response.arrayBuffer()
        }
      } catch { continue }
    }

    // Fallback to undefined for embedded WASM
    return undefined
  }

  private async loadModuleFactory(): Promise<Function> {
    // Deno-first development environment
    if (typeof globalThis.Deno !== 'undefined') {
      const moduleFactory = (await import('../../install/wasm/vorbis-main.js')).default
      return moduleFactory
    }

    // Web/CDN runtime - try CDN locations with proper ES6 imports
    const cdnUrls = [
      'https://wasm.discere.cloud/vorbis/latest/main/',
      'https://cdn.jsdelivr.net/npm/@discere-os/vorbis.wasm/dist/'
    ]

    for (const url of cdnUrls) {
      try {
        const moduleFactory = (await import(`${url}vorbis-main.js`)).default
        return moduleFactory
      } catch { continue }
    }

    throw new Error('Failed to load module factory from any source')
  }

  private setupBindings(): void {
    // Core Vorbis functions
    this._vorbis_info_init = this.module.cwrap('vorbis_info_init', 'void', ['number'])
    this._vorbis_info_clear = this.module.cwrap('vorbis_info_clear', 'void', ['number'])
    this._vorbis_comment_init = this.module.cwrap('vorbis_comment_init', 'void', ['number'])
    this._vorbis_comment_clear = this.module.cwrap('vorbis_comment_clear', 'void', ['number'])

    // Analysis (encoding) functions
    this._vorbis_analysis_init = this.module.cwrap('vorbis_analysis_init', 'number', ['number', 'number'])
    this._vorbis_analysis_buffer = this.module.cwrap('vorbis_analysis_buffer', 'number', ['number', 'number'])
    this._vorbis_analysis_wrote = this.module.cwrap('vorbis_analysis_wrote', 'number', ['number', 'number'])
    this._vorbis_analysis_blockout = this.module.cwrap('vorbis_analysis_blockout', 'number', ['number', 'number'])

    // Synthesis (decoding) functions
    this._vorbis_synthesis_headerin = this.module.cwrap('vorbis_synthesis_headerin', 'number', ['number', 'number', 'number'])
    this._vorbis_synthesis_init = this.module.cwrap('vorbis_synthesis_init', 'number', ['number', 'number'])
    this._vorbis_synthesis = this.module.cwrap('vorbis_synthesis', 'number', ['number', 'number'])
    this._vorbis_synthesis_blockin = this.module.cwrap('vorbis_synthesis_blockin', 'number', ['number', 'number'])
    this._vorbis_synthesis_pcmout = this.module.cwrap('vorbis_synthesis_pcmout', 'number', ['number', 'number'])
    this._vorbis_synthesis_read = this.module.cwrap('vorbis_synthesis_read', 'number', ['number', 'number'])

    // Encoding functions
    this._vorbis_encode_init = this.module.cwrap('vorbis_encode_init', 'number', ['number', 'number', 'number', 'number', 'number', 'number'])
    this._vorbis_encode_setup_managed = this.module.cwrap('vorbis_encode_setup_managed', 'number', ['number', 'number', 'number', 'number', 'number', 'number'])
    this._vorbis_encode_setup_vbr = this.module.cwrap('vorbis_encode_setup_vbr', 'number', ['number', 'number', 'number', 'number'])
    this._vorbis_encode_setup_init = this.module.cwrap('vorbis_encode_setup_init', 'number', ['number'])
    this._vorbis_encode_ctl = this.module.cwrap('vorbis_encode_ctl', 'number', ['number', 'number', 'number'])

    // Bitrate management
    this._vorbis_bitrate_addblock = this.module.cwrap('vorbis_bitrate_addblock', 'number', ['number'])
    this._vorbis_bitrate_flushpacket = this.module.cwrap('vorbis_bitrate_flushpacket', 'number', ['number', 'number'])

    // Utility functions
    this._vorbis_version_string = this.module.cwrap('vorbis_version_string', 'string', [])
    this._vorbis_granule_time = this.module.cwrap('vorbis_granule_time', 'number', ['number', 'number'])
    this._vorbis_packet_blocksize = this.module.cwrap('vorbis_packet_blocksize', 'number', ['number', 'number'])

    // SIMD functions if available
    if (this.options.simdOptimizations) {
      try {
        this._vorbis_simd_available = this.module.cwrap('vorbis_simd_available', 'number', [])
        this._vorbis_window_simd = this.module.cwrap('vorbis_window_simd', 'void', ['number', 'number', 'number'])
        this._vorbis_dot_product_simd = this.module.cwrap('vorbis_dot_product_simd', 'number', ['number', 'number', 'number'])
        this._vorbis_vector_add_simd = this.module.cwrap('vorbis_vector_add_simd', 'void', ['number', 'number', 'number'])
        this._vorbis_simd_benchmark = this.module.cwrap('vorbis_simd_benchmark', 'number', ['number'])
      } catch (error) {
        this.log('warn', 'SIMD functions not available in this build')
      }
    }
  }

  // Public API methods

  /**
   * Get Vorbis version string
   */
  getVersion(): string {
    this.ensureInitialized()
    return this._vorbis_version_string()
  }

  /**
   * Check if SIMD optimizations are available
   */
  isSIMDAvailable(): boolean {
    if (!this.initialized || !this._vorbis_simd_available) return false
    return this._vorbis_simd_available() === 1
  }

  /**
   * Initialize encoder with specified options
   */
  initializeEncoder(options: VorbisEncodingOptions): VorbisAnalysisState {
    this.ensureInitialized()

    const infoPtr = this.module._malloc(256) // Size of vorbis_info
    const commentPtr = this.module._malloc(256) // Size of vorbis_comment
    const dspPtr = this.module._malloc(1024) // Size of vorbis_dsp_state

    this._vorbis_info_init(infoPtr)
    this._vorbis_comment_init(commentPtr)

    let result: number
    if (options.quality !== undefined) {
      // VBR encoding
      result = this._vorbis_encode_setup_vbr(infoPtr, options.channels, options.sampleRate, options.quality)
    } else {
      // CBR/ABR encoding
      result = this._vorbis_encode_setup_managed(
        infoPtr,
        options.channels,
        options.sampleRate,
        options.maxBitrate || -1,
        options.bitrate || 128000,
        options.minBitrate || -1
      )
    }

    if (result !== 0) {
      this.module._free(infoPtr)
      this.module._free(commentPtr)
      this.module._free(dspPtr)
      throw new Error(`Failed to setup Vorbis encoder: ${result}`)
    }

    result = this._vorbis_encode_setup_init(infoPtr)
    if (result !== 0) {
      this.module._free(infoPtr)
      this.module._free(commentPtr)
      this.module._free(dspPtr)
      throw new Error(`Failed to initialize Vorbis encoder: ${result}`)
    }

    result = this._vorbis_analysis_init(dspPtr, infoPtr)
    if (result !== 0) {
      this.module._free(infoPtr)
      this.module._free(commentPtr)
      this.module._free(dspPtr)
      throw new Error(`Failed to initialize Vorbis analysis: ${result}`)
    }

    return {
      ptr: dspPtr,
      info: this.readVorbisInfo(infoPtr),
      granulepos: 0
    }
  }

  /**
   * Encode PCM audio samples to Vorbis packets
   */
  encode(state: VorbisAnalysisState, pcm: Float32Array, channels: number): VorbisEncodingResult {
    this.ensureInitialized()

    const samplesPerChannel = pcm.length / channels
    const bufferPtr = this._vorbis_analysis_buffer(state.ptr, samplesPerChannel)

    if (bufferPtr === 0) {
      return { status: 'error', error: 'Failed to get analysis buffer' }
    }

    // Copy interleaved PCM data to analysis buffer
    for (let ch = 0; ch < channels; ch++) {
      const channelPtr = this.module.HEAP32[(bufferPtr + ch * 4) >> 2]
      for (let i = 0; i < samplesPerChannel; i++) {
        this.module.HEAPF32[(channelPtr >> 2) + i] = pcm[i * channels + ch]
      }
    }

    // Tell the library how many samples we wrote
    const result = this._vorbis_analysis_wrote(state.ptr, samplesPerChannel)
    if (result !== 0) {
      return { status: 'error', error: `Analysis write failed: ${result}` }
    }

    // Try to get encoded packet
    const blockPtr = this.module._malloc(1024) // Size of vorbis_block
    const packetPtr = this.module._malloc(256) // Size of ogg_packet

    try {
      const blockResult = this._vorbis_analysis_blockout(state.ptr, blockPtr)
      if (blockResult === 1) {
        // Block ready - convert to packet
        const packetResult = this._vorbis_bitrate_flushpacket(state.ptr, packetPtr)
        if (packetResult === 1) {
          const packet = this.readOggPacket(packetPtr)
          return { status: 'success', packet }
        }
      }
    } finally {
      this.module._free(blockPtr)
      this.module._free(packetPtr)
    }

    return { status: 'need_more_data' }
  }

  /**
   * Initialize decoder
   */
  initializeDecoder(): VorbisSynthesisState {
    this.ensureInitialized()

    const infoPtr = this.module._malloc(256) // Size of vorbis_info
    const commentPtr = this.module._malloc(256) // Size of vorbis_comment
    const dspPtr = this.module._malloc(1024) // Size of vorbis_dsp_state

    this._vorbis_info_init(infoPtr)
    this._vorbis_comment_init(commentPtr)

    return {
      ptr: dspPtr,
      info: this.readVorbisInfo(infoPtr),
      pcm_current: 0
    }
  }

  /**
   * Decode Vorbis packet to PCM audio
   */
  decode(state: VorbisSynthesisState, packet: VorbisPacket): VorbisDecodingResult {
    this.ensureInitialized()

    const packetPtr = this.writeOggPacket(packet)

    try {
      // Synthesize the packet
      const synthResult = this._vorbis_synthesis(state.ptr, packetPtr)
      if (synthResult !== 0) {
        return { status: 'error', error: `Synthesis failed: ${synthResult}` }
      }

      // Submit to synthesis state
      const blockinResult = this._vorbis_synthesis_blockin(state.ptr, state.ptr)
      if (blockinResult !== 0) {
        return { status: 'error', error: `Block input failed: ${blockinResult}` }
      }

      // Get PCM data
      const pcmPtrPtr = this.module._malloc(4) // Pointer to float**
      const samples = this._vorbis_synthesis_pcmout(state.ptr, pcmPtrPtr)

      if (samples > 0) {
        const pcmPtr = this.module.HEAP32[pcmPtrPtr >> 2]
        const channels = state.info.channels
        const pcm = new Float32Array(samples * channels)

        // Interleave channel data
        for (let ch = 0; ch < channels; ch++) {
          const channelPtr = this.module.HEAP32[(pcmPtr + ch * 4) >> 2]
          for (let i = 0; i < samples; i++) {
            pcm[i * channels + ch] = this.module.HEAPF32[(channelPtr >> 2) + i]
          }
        }

        // Mark samples as read
        this._vorbis_synthesis_read(state.ptr, samples)
        this.module._free(pcmPtrPtr)

        return {
          status: 'success',
          pcm,
          samples,
          channels,
          sampleRate: state.info.rate
        }
      }

      this.module._free(pcmPtrPtr)
      return { status: 'need_more_data' }

    } finally {
      this.module._free(packetPtr)
    }
  }

  /**
   * Run SIMD performance benchmarks
   */
  benchmark(iterations: number = 10000): VorbisBenchmarkResult {
    this.ensureInitialized()

    if (!this.isSIMDAvailable()) {
      throw new Error('SIMD benchmarking requires SIMD support')
    }

    const startTime = performance.now()
    const duration = this._vorbis_simd_benchmark(iterations)
    const endTime = performance.now()

    const totalTime = endTime - startTime
    const opsPerSec = iterations / (totalTime / 1000)

    return {
      operation: 'SIMD Audio Processing',
      timeMs: totalTime,
      opsPerSec,
      simdUsed: true,
      memoryUsed: this.getMemoryUsage()
    }
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): number {
    if (!this.module) return 0
    return this.module.HEAP8?.length || 0
  }

  /**
   * Get logging entries
   */
  getLogEntries(): VorbisLogEntry[] {
    return [...this.logEntries]
  }

  /**
   * Clear logging entries
   */
  clearLogEntries(): void {
    this.logEntries = []
  }

  /**
   * Check if library is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.module) {
      // Cleanup will be handled by WASM module destruction
      this.module = null
      this.initialized = false
      this.log('info', 'Vorbis resources cleaned up')
    }
  }

  // Private helper methods

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Vorbis not initialized. Call initialize() first.')
    }
  }

  private log(level: VorbisLogLevel, message: string, context?: string): void {
    if (!this.options.verboseErrors && level === 'debug') return

    const entry: VorbisLogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context
    }

    this.logEntries.push(entry)

    // Keep log size manageable
    if (this.logEntries.length > 1000) {
      this.logEntries = this.logEntries.slice(-500)
    }

    // Console output for debugging
    if (this.options.verboseErrors) {
      console[level === 'error' ? 'error' : 'log'](`[Vorbis ${level}] ${message}`)
    }
  }

  private readVorbisInfo(ptr: number): VorbisInfo {
    return {
      version: this.module.HEAP32[ptr >> 2],
      channels: this.module.HEAP32[(ptr + 4) >> 2],
      rate: this.module.HEAP32[(ptr + 8) >> 2],
      bitrate_upper: this.module.HEAP32[(ptr + 12) >> 2],
      bitrate_nominal: this.module.HEAP32[(ptr + 16) >> 2],
      bitrate_lower: this.module.HEAP32[(ptr + 20) >> 2],
      bitrate_window: this.module.HEAP32[(ptr + 24) >> 2]
    }
  }

  private readOggPacket(ptr: number): VorbisPacket {
    const dataPtr = this.module.HEAP32[ptr >> 2]
    const bytes = this.module.HEAP32[(ptr + 4) >> 2]
    const data = new Uint8Array(this.module.HEAPU8.buffer, dataPtr, bytes)

    return {
      data: new Uint8Array(data),
      granulepos: this.module.HEAP32[(ptr + 8) >> 2],
      packetno: this.module.HEAP32[(ptr + 16) >> 2],
      b_o_s: this.module.HEAP8[ptr + 20] !== 0,
      e_o_s: this.module.HEAP8[ptr + 21] !== 0
    }
  }

  private writeOggPacket(packet: VorbisPacket): number {
    const ptr = this.module._malloc(32) // Size of ogg_packet
    const dataPtr = this.module._malloc(packet.data.length)

    // Copy packet data
    this.module.HEAPU8.set(packet.data, dataPtr)

    // Set packet fields
    this.module.HEAP32[ptr >> 2] = dataPtr
    this.module.HEAP32[(ptr + 4) >> 2] = packet.data.length
    this.module.HEAP32[(ptr + 8) >> 2] = packet.granulepos & 0xFFFFFFFF
    this.module.HEAP32[(ptr + 12) >> 2] = (packet.granulepos >>> 32) & 0xFFFFFFFF
    this.module.HEAP32[(ptr + 16) >> 2] = packet.packetno
    this.module.HEAP8[ptr + 20] = packet.b_o_s ? 1 : 0
    this.module.HEAP8[ptr + 21] = packet.e_o_s ? 1 : 0

    return ptr
  }

  // Function bindings (private)
  private _vorbis_info_init!: (info: number) => void
  private _vorbis_info_clear!: (info: number) => void
  private _vorbis_comment_init!: (comment: number) => void
  private _vorbis_comment_clear!: (comment: number) => void
  private _vorbis_analysis_init!: (dsp: number, info: number) => number
  private _vorbis_analysis_buffer!: (dsp: number, vals: number) => number
  private _vorbis_analysis_wrote!: (dsp: number, vals: number) => number
  private _vorbis_analysis_blockout!: (dsp: number, block: number) => number
  private _vorbis_synthesis_headerin!: (info: number, comment: number, packet: number) => number
  private _vorbis_synthesis_init!: (dsp: number, info: number) => number
  private _vorbis_synthesis!: (block: number, packet: number) => number
  private _vorbis_synthesis_blockin!: (dsp: number, block: number) => number
  private _vorbis_synthesis_pcmout!: (dsp: number, pcm: number) => number
  private _vorbis_synthesis_read!: (dsp: number, samples: number) => number
  private _vorbis_encode_init!: (info: number, channels: number, rate: number, max_bitrate: number, nominal_bitrate: number, min_bitrate: number) => number
  private _vorbis_encode_setup_managed!: (info: number, channels: number, rate: number, max_bitrate: number, nominal_bitrate: number, min_bitrate: number) => number
  private _vorbis_encode_setup_vbr!: (info: number, channels: number, rate: number, quality: number) => number
  private _vorbis_encode_setup_init!: (info: number) => number
  private _vorbis_encode_ctl!: (info: number, number: number, arg: number) => number
  private _vorbis_bitrate_addblock!: (block: number) => number
  private _vorbis_bitrate_flushpacket!: (dsp: number, packet: number) => number
  private _vorbis_version_string!: () => string
  private _vorbis_granule_time!: (dsp: number, granulepos: number) => number
  private _vorbis_packet_blocksize!: (info: number, packet: number) => number

  // SIMD function bindings (optional)
  private _vorbis_simd_available?: () => number
  private _vorbis_window_simd?: (data: number, window: number, n: number) => void
  private _vorbis_dot_product_simd?: (a: number, b: number, n: number) => number
  private _vorbis_vector_add_simd?: (dest: number, src: number, n: number) => void
  private _vorbis_simd_benchmark?: (iterations: number) => number
}

// Export types
export * from './types.ts'