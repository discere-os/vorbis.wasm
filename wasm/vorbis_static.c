/*
 * vorbis_static.c - Static dependency integration for MAIN_MODULE
 *
 * Copyright (c) 2002-2020 Xiph.org Foundation
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under BSD-3-Clause
 *
 * Static linking system for compression dependencies in MAIN_MODULE builds
 */

#include <emscripten.h>
#include <stdbool.h>
#include <string.h>
#include <math.h>
#include <stdlib.h>

// Conditional compilation based on available static libraries
#ifdef VORBIS_HAS_ZLIB_STATIC
#include <zlib.h>
#define HAS_ZLIB_COMPRESSION 1
#else
#define HAS_ZLIB_COMPRESSION 0
#endif

// Static compression availability check
EMSCRIPTEN_KEEPALIVE
bool vorbis_has_compression_static() {
#ifdef VORBIS_HAS_ZLIB_STATIC
    return true;
#else
    return false;
#endif
}

// Static compression function for MAIN_MODULE
EMSCRIPTEN_KEEPALIVE
int vorbis_compress_packet_static(const void* packet_data, unsigned long packet_size,
                                 void* compressed_data, unsigned long* compressed_size) {
#ifdef VORBIS_HAS_ZLIB_STATIC
    // Use statically linked zlib
    int result = compress2((Bytef*)compressed_data, compressed_size,
                          (const Bytef*)packet_data, packet_size, Z_DEFAULT_COMPRESSION);
    return result;
#else
    // Fallback: copy without compression
    if (*compressed_size >= packet_size) {
        memcpy(compressed_data, packet_data, packet_size);
        *compressed_size = packet_size;
        return 0; // Success, no compression
    }
    return -1; // Buffer too small
#endif
}

// Static decompression function for MAIN_MODULE
EMSCRIPTEN_KEEPALIVE
int vorbis_decompress_packet_static(const void* compressed_data, unsigned long compressed_size,
                                   void* packet_data, unsigned long* packet_size) {
#ifdef VORBIS_HAS_ZLIB_STATIC
    // Use statically linked zlib
    int result = uncompress((Bytef*)packet_data, packet_size,
                           (const Bytef*)compressed_data, compressed_size);
    return result;
#else
    // Fallback: copy without decompression
    if (*packet_size >= compressed_size) {
        memcpy(packet_data, compressed_data, compressed_size);
        *packet_size = compressed_size;
        return 0; // Success, no decompression
    }
    return -1; // Buffer too small
#endif
}

// Get compression bound for buffer sizing
EMSCRIPTEN_KEEPALIVE
unsigned long vorbis_compression_bound_static(unsigned long source_size) {
#ifdef VORBIS_HAS_ZLIB_STATIC
    return compressBound(source_size);
#else
    return source_size; // Return original size if compression unavailable
#endif
}

// Benchmark static compression performance
EMSCRIPTEN_KEEPALIVE
double vorbis_benchmark_compression_static(int iterations) {
#ifdef VORBIS_HAS_ZLIB_STATIC
    // Test data: typical Vorbis packet size
    const unsigned long test_size = 2048;
    unsigned char test_data[test_size];
    unsigned char compressed[4096]; // Conservative buffer

    // Initialize test data with audio-like pattern
    for (unsigned long i = 0; i < test_size; i++) {
        test_data[i] = (unsigned char)(i * 17 + (i % 256));
    }

    double start_time = emscripten_get_now();

    for (int i = 0; i < iterations; i++) {
        unsigned long compressed_size = sizeof(compressed);
        compress2(compressed, &compressed_size, test_data, test_size, Z_DEFAULT_COMPRESSION);
    }

    double end_time = emscripten_get_now();
    return end_time - start_time;
#else
    return -1.0; // No compression available
#endif
}

// Get static compression features information
EMSCRIPTEN_KEEPALIVE
int vorbis_get_static_features() {
    int features = 0;

#ifdef VORBIS_HAS_ZLIB_STATIC
    features |= 0x01; // Bit 0: zlib static linking available
#endif

    return features;
}

// Test compression ratio with real audio-like data
EMSCRIPTEN_KEEPALIVE
float vorbis_test_compression_ratio() {
#ifdef VORBIS_HAS_ZLIB_STATIC
    // Create audio-like test pattern
    const unsigned long test_size = 4096;
    unsigned char audio_pattern[test_size];

    // Generate pseudo-audio pattern with some redundancy
    for (unsigned long i = 0; i < test_size; i++) {
        // Mix of periodic patterns and pseudo-random noise
        unsigned char periodic = (unsigned char)(128 + 100 * sin(i * 0.1));
        unsigned char noise = (unsigned char)((i * 17 + i % 13) & 0xFF);
        audio_pattern[i] = (periodic + noise) / 2;
    }

    // Compress the test pattern
    unsigned long compressed_size = compressBound(test_size);
    unsigned char* compressed = malloc(compressed_size);

    if (compressed == NULL) {
        return -1.0f;
    }

    int result = compress2(compressed, &compressed_size, audio_pattern, test_size, Z_DEFAULT_COMPRESSION);

    if (result != Z_OK) {
        free(compressed);
        return -1.0f;
    }

    float ratio = (float)test_size / (float)compressed_size;
    free(compressed);
    return ratio;
#else
    return 1.0f; // No compression available, ratio is 1:1
#endif
}