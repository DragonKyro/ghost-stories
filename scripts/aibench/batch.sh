#!/bin/sh
# Run several benchmark variants one after another on a frozen copy of src/ai:
#   batch.sh "<setups>" "<seeds>" <snapshot-name> '<over1>' '<over2>' ...
setups=$1; seeds=$2; snap=$3; shift 3
for over in "$@"; do
  echo "=== $over"
  node scripts/aibench/bench.mjs --setups "$setups" --seeds "$seeds" --over "$over" --snap "$snap" | grep -v "^("
done
