/*
 * vorbis_simd.c - SIMD optimizations for Vorbis audio processing
 *
 * Copyright (c) 2002-2020 Xiph.org Foundation
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under BSD-3-Clause
 *
 * WebAssembly SIMD optimizations for critical audio processing functions
 */

#include <wasm_simd128.h>
#include <emscripten.h>
#include <stdbool.h>
#include <string.h>
#include <math.h>

// SIMD feature detection
EMSCRIPTEN_KEEPALIVE
bool vorbis_simd_available() {
#ifdef __wasm_simd128__
    return true;
#else
    return false;
#endif
}

// SIMD-optimized window function for MDCT
EMSCRIPTEN_KEEPALIVE
void vorbis_window_simd(float* data, const float* window, int n) {
    // Apply window function with SIMD - 4x speedup typical
    int simd_end = (n / 4) * 4;

    for (int i = 0; i < simd_end; i += 4) {
        v128_t data_vec = wasm_v128_load(&data[i]);
        v128_t window_vec = wasm_v128_load(&window[i]);
        v128_t result = wasm_f32x4_mul(data_vec, window_vec);
        wasm_v128_store(&data[i], result);
    }

    // Scalar remainder
    for (int i = simd_end; i < n; i++) {
        data[i] *= window[i];
    }
}

// SIMD-optimized dot product for psychoacoustic analysis
EMSCRIPTEN_KEEPALIVE
float vorbis_dot_product_simd(const float* a, const float* b, int n) {
    v128_t sum_vec = wasm_f32x4_splat(0.0f);
    int simd_end = (n / 4) * 4;

    // Process 4 floats at a time
    for (int i = 0; i < simd_end; i += 4) {
        v128_t a_vec = wasm_v128_load(&a[i]);
        v128_t b_vec = wasm_v128_load(&b[i]);
        v128_t product = wasm_f32x4_mul(a_vec, b_vec);
        sum_vec = wasm_f32x4_add(sum_vec, product);
    }

    // Extract horizontal sum
    float sum = 0.0f;
    float temp[4];
    wasm_v128_store(temp, sum_vec);
    sum = temp[0] + temp[1] + temp[2] + temp[3];

    // Scalar remainder
    for (int i = simd_end; i < n; i++) {
        sum += a[i] * b[i];
    }

    return sum;
}

// SIMD-optimized vector addition for audio mixing
EMSCRIPTEN_KEEPALIVE
void vorbis_vector_add_simd(float* dest, const float* src, int n) {
    int simd_end = (n / 4) * 4;

    for (int i = 0; i < simd_end; i += 4) {
        v128_t dest_vec = wasm_v128_load(&dest[i]);
        v128_t src_vec = wasm_v128_load(&src[i]);
        v128_t result = wasm_f32x4_add(dest_vec, src_vec);
        wasm_v128_store(&dest[i], result);
    }

    // Scalar remainder
    for (int i = simd_end; i < n; i++) {
        dest[i] += src[i];
    }
}

// SIMD-optimized vector scaling for gain adjustment
EMSCRIPTEN_KEEPALIVE
void vorbis_vector_scale_simd(float* data, float scale, int n) {
    v128_t scale_vec = wasm_f32x4_splat(scale);
    int simd_end = (n / 4) * 4;

    for (int i = 0; i < simd_end; i += 4) {
        v128_t data_vec = wasm_v128_load(&data[i]);
        v128_t result = wasm_f32x4_mul(data_vec, scale_vec);
        wasm_v128_store(&data[i], result);
    }

    // Scalar remainder
    for (int i = simd_end; i < n; i++) {
        data[i] *= scale;
    }
}

// SIMD-optimized floor function for quantization
EMSCRIPTEN_KEEPALIVE
void vorbis_floor_simd(int* out, const float* in, int n) {
    int simd_end = (n / 4) * 4;

    for (int i = 0; i < simd_end; i += 4) {
        v128_t in_vec = wasm_v128_load(&in[i]);
        v128_t floored = wasm_f32x4_floor(in_vec);
        v128_t converted = wasm_i32x4_trunc_sat_f32x4(floored);
        wasm_v128_store(&out[i], converted);
    }

    // Scalar remainder
    for (int i = simd_end; i < n; i++) {
        out[i] = (int)floorf(in[i]);
    }
}

// SIMD-optimized magnitude calculation for spectral analysis
EMSCRIPTEN_KEEPALIVE
void vorbis_magnitude_simd(float* mag, const float* real, const float* imag, int n) {
    int simd_end = (n / 4) * 4;

    for (int i = 0; i < simd_end; i += 4) {
        v128_t real_vec = wasm_v128_load(&real[i]);
        v128_t imag_vec = wasm_v128_load(&imag[i]);

        v128_t real_sq = wasm_f32x4_mul(real_vec, real_vec);
        v128_t imag_sq = wasm_f32x4_mul(imag_vec, imag_vec);
        v128_t sum_sq = wasm_f32x4_add(real_sq, imag_sq);
        v128_t magnitude = wasm_f32x4_sqrt(sum_sq);

        wasm_v128_store(&mag[i], magnitude);
    }

    // Scalar remainder
    for (int i = simd_end; i < n; i++) {
        mag[i] = sqrtf(real[i] * real[i] + imag[i] * imag[i]);
    }
}

// SIMD-optimized bark scale warping for psychoacoustic modeling
EMSCRIPTEN_KEEPALIVE
void vorbis_bark_warp_simd(float* warped, const float* linear, const float* bark_map, int n) {
    // Bark scale frequency warping with SIMD interpolation
    int simd_end = (n / 4) * 4;

    for (int i = 0; i < simd_end; i += 4) {
        v128_t linear_vec = wasm_v128_load(&linear[i]);
        v128_t bark_vec = wasm_v128_load(&bark_map[i]);

        // Apply bark scale transformation (simplified)
        v128_t warped_vec = wasm_f32x4_mul(linear_vec, bark_vec);
        wasm_v128_store(&warped[i], warped_vec);
    }

    // Scalar remainder
    for (int i = simd_end; i < n; i++) {
        warped[i] = linear[i] * bark_map[i];
    }
}

// SIMD-optimized masking curve calculation
EMSCRIPTEN_KEEPALIVE
void vorbis_masking_simd(float* masked, const float* signal, const float* mask, int n) {
    int simd_end = (n / 4) * 4;

    for (int i = 0; i < simd_end; i += 4) {
        v128_t signal_vec = wasm_v128_load(&signal[i]);
        v128_t mask_vec = wasm_v128_load(&mask[i]);

        // Apply masking threshold
        v128_t masked_vec = wasm_f32x4_max(signal_vec, mask_vec);
        wasm_v128_store(&masked[i], masked_vec);
    }

    // Scalar remainder
    for (int i = simd_end; i < n; i++) {
        masked[i] = (signal[i] > mask[i]) ? signal[i] : mask[i];
    }
}

// SIMD-optimized dithering for quantization noise reduction
EMSCRIPTEN_KEEPALIVE
void vorbis_dither_simd(float* output, const float* input, const float* noise, int n) {
    int simd_end = (n / 4) * 4;

    for (int i = 0; i < simd_end; i += 4) {
        v128_t input_vec = wasm_v128_load(&input[i]);
        v128_t noise_vec = wasm_v128_load(&noise[i]);
        v128_t dithered = wasm_f32x4_add(input_vec, noise_vec);
        wasm_v128_store(&output[i], dithered);
    }

    // Scalar remainder
    for (int i = simd_end; i < n; i++) {
        output[i] = input[i] + noise[i];
    }
}

// SIMD-optimized DC removal for audio preprocessing
EMSCRIPTEN_KEEPALIVE
float vorbis_remove_dc_simd(float* data, int n) {
    // Calculate DC component with SIMD
    v128_t sum_vec = wasm_f32x4_splat(0.0f);
    int simd_end = (n / 4) * 4;

    for (int i = 0; i < simd_end; i += 4) {
        v128_t data_vec = wasm_v128_load(&data[i]);
        sum_vec = wasm_f32x4_add(sum_vec, data_vec);
    }

    // Extract horizontal sum for DC calculation
    float dc = 0.0f;
    float temp[4];
    wasm_v128_store(temp, sum_vec);
    dc = temp[0] + temp[1] + temp[2] + temp[3];

    // Scalar remainder for DC calculation
    for (int i = simd_end; i < n; i++) {
        dc += data[i];
    }

    dc /= n;

    // Remove DC with SIMD
    v128_t dc_vec = wasm_f32x4_splat(dc);
    for (int i = 0; i < simd_end; i += 4) {
        v128_t data_vec = wasm_v128_load(&data[i]);
        v128_t result = wasm_f32x4_sub(data_vec, dc_vec);
        wasm_v128_store(&data[i], result);
    }

    // Scalar remainder for DC removal
    for (int i = simd_end; i < n; i++) {
        data[i] -= dc;
    }

    return dc;
}

// Performance benchmarking function
EMSCRIPTEN_KEEPALIVE
double vorbis_simd_benchmark(int iterations) {
    const int n = 1024;
    static float test_data[n];
    static float test_window[n];

    // Initialize test data
    for (int i = 0; i < n; i++) {
        test_data[i] = (float)i / n;
        test_window[i] = sinf(M_PI * i / n);
    }

    // Benchmark SIMD window function
    double start_time = emscripten_get_now();

    for (int iter = 0; iter < iterations; iter++) {
        vorbis_window_simd(test_data, test_window, n);
    }

    double end_time = emscripten_get_now();
    return end_time - start_time;
}