#!/bin/bash
# Temporary test runner script for Hardhat + Viem tests
# This bypasses Hardhat's test discovery issues in v3

# Set environment
export NODE_ENV=test

# Run tests with TSX
npx tsx --test test/ChainEquityToken.test.ts
