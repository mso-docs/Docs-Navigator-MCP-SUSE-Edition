#!/bin/bash
# Index all documentation sources sequentially

SOURCES=("suse" "rancher" "rke2" "longhorn" "harvester" "neuvector" "kubewarden")

for SOURCE in "${SOURCES[@]}"; do
  echo "========================================="
  echo "Indexing: $SOURCE"
  echo "========================================="
  npm run index "$SOURCE" -- --force
  echo ""
  echo "Completed: $SOURCE"
  echo ""
  sleep 2
done

echo "========================================="
echo "All sources indexed!"
echo "========================================="
npm run stats
