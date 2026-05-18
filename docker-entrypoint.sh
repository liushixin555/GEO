#!/bin/sh
set -e

# Start Node.js backend in background
node dist/apis/server.js &

# Start nginx in foreground
exec nginx -g 'daemon off;'
