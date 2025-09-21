#!/bin/bash

# Simple test to verify interactive mode structure
echo "Testing interactive mode help..."

# Test that init command shows all options including RPC ones
tributary init --help | grep -E "(devnet-rpc|testnet-rpc|mainnet-rpc)" && echo "✅ RPC options found in help" || echo "❌ RPC options missing"

echo ""
echo "Interactive mode setup complete!"
echo "Manual testing required: Run 'tributary init --interactive --force' to test the interactive prompts"