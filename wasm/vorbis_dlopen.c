/*
 * vorbis_dlopen.c - Dynamic dependency loading for SIDE_MODULE
 *
 * Copyright (c) 2002-2020 Xiph.org Foundation
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under BSD-3-Clause
 *
 * Dynamic loading system for optional dependencies in SIDE_MODULE builds
 */

#include <emscripten.h>
#include <dlfcn.h>
#include <stdbool.h>
#include <string.h>

// Global handles for dynamically loaded libraries
static void* zlib_handle = NULL;
static void* flac_handle = NULL;

// Function pointers for dynamically loaded functions
static int (*zlib_compress2)(unsigned char *dest, unsigned long *destLen,
                           const unsigned char *source, unsigned long sourceLen, int level) = NULL;
static int (*zlib_uncompress)(unsigned char *dest, unsigned long *destLen,
                            const unsigned char *source, unsigned long sourceLen) = NULL;
static unsigned long (*zlib_compressBound)(unsigned long sourceLen) = NULL;

// FLAC function pointers (for future integration)
static void* (*flac_encoder_new)(void) = NULL;
static bool (*flac_encoder_finish)(void* encoder) = NULL;

// Dependency availability detection
EMSCRIPTEN_KEEPALIVE
bool vorbis_has_zlib() {
    if (zlib_handle != NULL) return true;

    // Try to load zlib-side.wasm
    zlib_handle = dlopen("zlib-side.wasm", RTLD_NOW);
    if (zlib_handle == NULL) {
        return false;
    }

    // Load essential functions
    zlib_compress2 = dlsym(zlib_handle, "compress2");
    zlib_uncompress = dlsym(zlib_handle, "uncompress");
    zlib_compressBound = dlsym(zlib_handle, "compressBound");

    return (zlib_compress2 != NULL && zlib_uncompress != NULL && zlib_compressBound != NULL);
}

EMSCRIPTEN_KEEPALIVE
bool vorbis_has_flac() {
    if (flac_handle != NULL) return true;

    // Try to load flac-side.wasm
    flac_handle = dlopen("flac-side.wasm", RTLD_NOW);
    if (flac_handle == NULL) {
        return false;
    }

    // Load essential functions (placeholder for future FLAC integration)
    flac_encoder_new = dlsym(flac_handle, "FLAC__stream_encoder_new");
    flac_encoder_finish = dlsym(flac_handle, "FLAC__stream_encoder_finish");

    return (flac_encoder_new != NULL && flac_encoder_finish != NULL);
}

// Enhanced Ogg stream compression using zlib (if available)
EMSCRIPTEN_KEEPALIVE
int vorbis_compress_ogg_stream(const unsigned char* input, unsigned long input_size,
                              unsigned char* output, unsigned long* output_size, int level) {
    if (!vorbis_has_zlib()) {
        return -1; // Compression not available
    }

    return zlib_compress2(output, output_size, input, input_size, level);
}

EMSCRIPTEN_KEEPALIVE
int vorbis_decompress_ogg_stream(const unsigned char* input, unsigned long input_size,
                                unsigned char* output, unsigned long* output_size) {
    if (!vorbis_has_zlib()) {
        return -1; // Decompression not available
    }

    return zlib_uncompress(output, output_size, input, input_size);
}

EMSCRIPTEN_KEEPALIVE
unsigned long vorbis_compression_bound(unsigned long source_size) {
    if (!vorbis_has_zlib()) {
        return source_size; // Return original size if compression unavailable
    }

    return zlib_compressBound(source_size);
}

// Memory-efficient Ogg packet compression
EMSCRIPTEN_KEEPALIVE
int vorbis_compress_packet(const void* packet_data, unsigned long packet_size,
                          void* compressed_data, unsigned long* compressed_size) {
    if (!vorbis_has_zlib()) {
        // Fallback: copy without compression
        if (*compressed_size >= packet_size) {
            memcpy(compressed_data, packet_data, packet_size);
            *compressed_size = packet_size;
            return 0; // Success, no compression
        }
        return -2; // Buffer too small
    }

    // Compress with optimal level for audio data
    int result = zlib_compress2((unsigned char*)compressed_data, compressed_size,
                               (const unsigned char*)packet_data, packet_size, 6);

    return result;
}

// Cleanup function
EMSCRIPTEN_KEEPALIVE
void vorbis_cleanup_dependencies() {
    if (zlib_handle != NULL) {
        dlclose(zlib_handle);
        zlib_handle = NULL;
        zlib_compress2 = NULL;
        zlib_uncompress = NULL;
        zlib_compressBound = NULL;
    }

    if (flac_handle != NULL) {
        dlclose(flac_handle);
        flac_handle = NULL;
        flac_encoder_new = NULL;
        flac_encoder_finish = NULL;
    }
}

// Get dependency status information
EMSCRIPTEN_KEEPALIVE
int vorbis_get_dependency_status() {
    int status = 0;

    if (vorbis_has_zlib()) {
        status |= 0x01; // Bit 0: zlib available
    }

    if (vorbis_has_flac()) {
        status |= 0x02; // Bit 1: FLAC available
    }

    return status;
}

// Performance test for compression
EMSCRIPTEN_KEEPALIVE
double vorbis_benchmark_compression(int iterations) {
    if (!vorbis_has_zlib()) {
        return -1.0; // No compression available
    }

    // Test data: typical Vorbis packet size
    const unsigned long test_size = 2048;
    unsigned char test_data[test_size];
    unsigned char compressed[test_size * 2]; // Conservative buffer

    // Initialize test data with audio-like pattern
    for (unsigned long i = 0; i < test_size; i++) {
        test_data[i] = (unsigned char)(i * 17 + (i % 256));
    }

    double start_time = emscripten_get_now();

    for (int i = 0; i < iterations; i++) {
        unsigned long compressed_size = test_size * 2;
        zlib_compress2(compressed, &compressed_size, test_data, test_size, 6);
    }

    double end_time = emscripten_get_now();
    return end_time - start_time;
}