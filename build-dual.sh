#!/bin/bash
# build-dual.sh - Dual build system for vorbis.wasm
#
# Copyright (c) 2002-2020 Xiph.org Foundation
# Copyright (c) 2025 Superstruct Ltd, New Zealand
# Licensed under BSD-3-Clause

set -euo pipefail

VARIANT="${1:-all}"
BUILD_DIR="${BUILD_DIR:-./build-dual}"
INSTALL_PREFIX="${INSTALL_PREFIX:-./install}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check dependencies
check_prerequisites() {
    log_info "Checking build prerequisites..."

    if ! command -v emcc &> /dev/null; then
        log_error "Emscripten not found. Please install and activate EMSDK."
        exit 1
    fi

    # Check for ogg.wasm dependency
    if [ ! -f "../ogg.wasm/src/bitwise.c" ]; then
        log_error "ogg.wasm dependency not found. Please ensure ogg.wasm is available."
        exit 1
    fi

    log_success "Prerequisites check completed"
}

# Build SIDE_MODULE (production)
build_side_module() {
    log_info "Building vorbis-side.wasm for production..."
    mkdir -p "${BUILD_DIR}-side"
    cd "${BUILD_DIR}-side"

    # Core libvorbis sources (exclude psytune.c - development tool)
    VORBIS_SOURCES="../lib/analysis.c ../lib/barkmel.c ../lib/bitrate.c ../lib/block.c ../lib/codebook.c ../lib/envelope.c ../lib/floor0.c ../lib/floor1.c ../lib/info.c ../lib/lookup.c ../lib/lpc.c ../lib/lsp.c ../lib/mapping0.c ../lib/mdct.c ../lib/misc.c ../lib/psy.c ../lib/registry.c ../lib/res0.c ../lib/sharedbook.c ../lib/smallft.c ../lib/synthesis.c ../lib/tone.c ../lib/vorbisenc.c ../lib/vorbisfile.c ../lib/window.c"

    # Ogg dependency sources (compiled directly)
    OGG_SOURCES="../../ogg.wasm/src/bitwise.c ../../ogg.wasm/src/framing.c"

    VORBIS_INCLUDES="-I../include -I../lib -I../../ogg.wasm/include -I../../ogg.wasm/build-dual-side/include"

    # SIMD optimizations for audio processing
    SIMD_SOURCES="../wasm/vorbis_simd.c"

    emcc ${VORBIS_SOURCES} ${OGG_SOURCES} ${SIMD_SOURCES} \
        ${VORBIS_INCLUDES} \
        -O3 -flto -msimd128 \
        -sSIDE_MODULE=1 \
        -sSTANDALONE_WASM=1 \
        -sEXPORTED_FUNCTIONS='["_vorbis_info_init","_vorbis_info_clear","_vorbis_comment_init","_vorbis_comment_clear","_vorbis_analysis_init","_vorbis_analysis_buffer","_vorbis_analysis_wrote","_vorbis_analysis_blockout","_vorbis_synthesis_headerin","_vorbis_synthesis_init","_vorbis_synthesis","_vorbis_synthesis_blockin","_vorbis_synthesis_pcmout","_vorbis_synthesis_read","_vorbis_encode_init","_vorbis_encode_setup_managed","_vorbis_encode_setup_vbr","_vorbis_encode_setup_init","_vorbis_encode_ctl","_vorbis_bitrate_addblock","_vorbis_bitrate_flushpacket","_vorbis_version_string","_vorbis_granule_time","_vorbis_packet_blocksize","_vorbis_simd_available","_vorbis_window_simd","_vorbis_dot_product_simd","_vorbis_vector_add_simd","_vorbis_simd_benchmark"]' \
        -DHAVE_ALLOCA_H=1 \
        -DVORBIS_ENABLE_SIMD=1 \
        -o vorbis-side.wasm

    # Install artifacts
    mkdir -p "${INSTALL_PREFIX}/wasm"
    cp vorbis-side.wasm "${INSTALL_PREFIX}/wasm/"

    log_success "SIDE_MODULE: ${INSTALL_PREFIX}/wasm/vorbis-side.wasm ($(du -h "${INSTALL_PREFIX}/wasm/vorbis-side.wasm" | cut -f1))"
    cd ..
}

# Build MAIN_MODULE (testing/NPM)
build_main_module() {
    log_info "Building vorbis-main.js for testing..."
    mkdir -p "${BUILD_DIR}-main"
    cd "${BUILD_DIR}-main"

    # Core libvorbis sources (exclude psytune.c - development tool)
    VORBIS_SOURCES="../lib/analysis.c ../lib/barkmel.c ../lib/bitrate.c ../lib/block.c ../lib/codebook.c ../lib/envelope.c ../lib/floor0.c ../lib/floor1.c ../lib/info.c ../lib/lookup.c ../lib/lpc.c ../lib/lsp.c ../lib/mapping0.c ../lib/mdct.c ../lib/misc.c ../lib/psy.c ../lib/registry.c ../lib/res0.c ../lib/sharedbook.c ../lib/smallft.c ../lib/synthesis.c ../lib/tone.c ../lib/vorbisenc.c ../lib/vorbisfile.c ../lib/window.c"

    # Ogg dependency sources (compiled directly)
    OGG_SOURCES="../../ogg.wasm/src/bitwise.c ../../ogg.wasm/src/framing.c"

    VORBIS_INCLUDES="-I../include -I../lib -I../../ogg.wasm/include -I../../ogg.wasm/build-dual-side/include"

    # SIMD optimizations
    SIMD_SOURCES="../wasm/vorbis_simd.c"

    emcc ${VORBIS_SOURCES} ${OGG_SOURCES} ${SIMD_SOURCES} \
        ${VORBIS_INCLUDES} \
        -O3 -flto -msimd128 \
        -sMODULARIZE=1 \
        -sEXPORT_ES6=1 \
        -sEXPORT_NAME="VorbisModule" \
        -sEXPORTED_FUNCTIONS='["_vorbis_info_init","_vorbis_info_clear","_vorbis_comment_init","_vorbis_comment_clear","_vorbis_analysis_init","_vorbis_analysis_buffer","_vorbis_analysis_wrote","_vorbis_analysis_blockout","_vorbis_synthesis_headerin","_vorbis_synthesis_init","_vorbis_synthesis","_vorbis_synthesis_blockin","_vorbis_synthesis_pcmout","_vorbis_synthesis_read","_vorbis_encode_init","_vorbis_encode_setup_managed","_vorbis_encode_setup_vbr","_vorbis_encode_setup_init","_vorbis_encode_ctl","_vorbis_bitrate_addblock","_vorbis_bitrate_flushpacket","_vorbis_version_string","_vorbis_granule_time","_vorbis_packet_blocksize","_vorbis_simd_available","_vorbis_window_simd","_vorbis_dot_product_simd","_vorbis_vector_add_simd","_vorbis_simd_benchmark","_malloc","_free"]' \
        -sEXPORTED_RUNTIME_METHODS='["cwrap","ccall","UTF8ToString","HEAPU8","HEAP32","HEAPF32"]' \
        -sALLOW_MEMORY_GROWTH=1 \
        -sINITIAL_MEMORY=67108864 \
        -sMAXIMUM_MEMORY=536870912 \
        -sENVIRONMENT=web,webview,worker \
        -sNODEJS_CATCH_EXIT=0 \
        -sNODEJS_CATCH_REJECTION=0 \
        -DHAVE_ALLOCA_H=1 \
        -DVORBIS_ENABLE_SIMD=1 \
        -o vorbis-main.js

    # Install artifacts
    mkdir -p "${INSTALL_PREFIX}/wasm"
    cp vorbis-main.js "${INSTALL_PREFIX}/wasm/"
    cp vorbis-main.wasm "${INSTALL_PREFIX}/wasm/"

    log_success "MAIN_MODULE: ${INSTALL_PREFIX}/wasm/vorbis-main.js ($(du -h "${INSTALL_PREFIX}/wasm/vorbis-main.js" | cut -f1))"
    cd ..
}

case "$VARIANT" in
    side) check_prerequisites && build_side_module ;;
    main) check_prerequisites && build_main_module ;;
    all) check_prerequisites && build_side_module && build_main_module ;;
    clean) rm -rf "${BUILD_DIR}"* "${INSTALL_PREFIX}" ;;
    *) echo "Usage: $0 [side|main|all|clean]"; exit 1 ;;
esac