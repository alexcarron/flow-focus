#!/bin/bash
cd "$(dirname "$0")"

# Run npm scripts concurrently
npm run start &
npm run server &

# Wait for any process to exit
wait

