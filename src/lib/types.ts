/**
 * TypeScript definitions for vorbis.wasm
 * Copyright (c) 2002-2020 Xiph.org Foundation
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under BSD-3-Clause
 */

export interface VorbisOptions {
  /** Enable SIMD optimizations for audio processing */
  simdOptimizations?: boolean
  /** Maximum memory allocation in MB */
  maxMemoryMB?: number
  /** Enable detailed error reporting */
  verboseErrors?: boolean
  /** Enable compression features (zlib integration) */
  compressionSupport?: boolean
  /** Enable lossless codec integration (FLAC support) */
  losslessSupport?: boolean
}

export interface VorbisDependencyInfo {
  /** zlib compression support available */
  hasZlib: boolean
  /** FLAC lossless codec support available */
  hasFLAC: boolean
  /** Static linking used (MAIN_MODULE) */
  isStatic: boolean
  /** Dynamic loading used (SIDE_MODULE) */
  isDynamic: boolean
  /** Dependency status bitmask */
  statusMask: number
}

export interface VorbisCompressionResult {
  /** Status of compression operation */
  status: 'success' | 'no_compression' | 'error'
  /** Compressed data */
  data?: Uint8Array
  /** Original size in bytes */
  originalSize: number
  /** Compressed size in bytes */
  compressedSize: number
  /** Compression ratio (originalSize / compressedSize) */
  compressionRatio: number
  /** Error message if status is 'error' */
  error?: string
}

export interface VorbisInfo {
  /** Vorbis version */
  version: number
  /** Number of audio channels */
  channels: number
  /** Sample rate in Hz */
  rate: number
  /** Upper bitrate limit */
  bitrate_upper: number
  /** Nominal bitrate */
  bitrate_nominal: number
  /** Lower bitrate limit */
  bitrate_lower: number
  /** Bitrate window size */
  bitrate_window: number
}

export interface VorbisComment {
  /** Array of comment strings in format "FIELD=value" */
  user_comments: string[]
  /** Total number of comments */
  comments: number
  /** Vendor identification string */
  vendor: string
}

export interface VorbisEncodingOptions {
  /** Number of audio channels (1 or 2) */
  channels: number
  /** Sample rate in Hz (8000-48000) */
  sampleRate: number
  /** Quality setting (-1.0 to 10.0, recommended: 0.0-6.0) */
  quality?: number
  /** Target bitrate in bits per second */
  bitrate?: number
  /** Minimum bitrate in bits per second */
  minBitrate?: number
  /** Maximum bitrate in bits per second */
  maxBitrate?: number
  /** Use managed bitrate mode */
  managed?: boolean
}

export interface VorbisPacket {
  /** Packet data */
  data: Uint8Array
  /** Granule position */
  granulepos: number
  /** Packet number */
  packetno: number
  /** Beginning of stream flag */
  b_o_s: boolean
  /** End of stream flag */
  e_o_s: boolean
}

export interface VorbisDecodingResult {
  /** Status of decoding operation */
  status: 'success' | 'need_more_data' | 'error'
  /** Decoded PCM audio samples (interleaved for multi-channel) */
  pcm?: Float32Array
  /** Number of samples per channel */
  samples?: number
  /** Number of channels */
  channels?: number
  /** Sample rate */
  sampleRate?: number
  /** Error message if status is 'error' */
  error?: string
}

export interface VorbisEncodingResult {
  /** Status of encoding operation */
  status: 'success' | 'need_more_data' | 'error'
  /** Encoded Vorbis packet */
  packet?: VorbisPacket
  /** Error message if status is 'error' */
  error?: string
}

export interface VorbisAnalysisState {
  /** Internal analysis state pointer */
  ptr: number
  /** Associated Vorbis info */
  info: VorbisInfo
  /** Current granule position */
  granulepos: number
}

export interface VorbisSynthesisState {
  /** Internal synthesis state pointer */
  ptr: number
  /** Associated Vorbis info */
  info: VorbisInfo
  /** Current PCM read position */
  pcm_current: number
}

export interface VorbisBlock {
  /** Internal block state pointer */
  ptr: number
  /** PCM samples in this block */
  pcm?: Float32Array[]
  /** Length of PCM samples */
  pcm_length: number
}

export interface VorbisBenchmarkResult {
  /** Operation name */
  operation: string
  /** Time taken in milliseconds */
  timeMs: number
  /** Throughput in operations per second */
  opsPerSec: number
  /** SIMD acceleration used */
  simdUsed: boolean
  /** Memory usage in bytes */
  memoryUsed?: number
}

export interface VorbisFileInfo {
  /** File duration in seconds */
  duration: number
  /** Total samples */
  totalSamples: number
  /** Bitrate information */
  bitrate: {
    nominal: number
    lower: number
    upper: number
    window: number
  }
  /** Audio format info */
  format: {
    channels: number
    sampleRate: number
    version: number
  }
  /** Comments and metadata */
  comments: VorbisComment
}

export type VorbisLogLevel = 'error' | 'warn' | 'info' | 'debug'

export interface VorbisLogEntry {
  level: VorbisLogLevel
  message: string
  timestamp: number
  context?: string
}