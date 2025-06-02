#!/bin/bash

echo "Starting HomeBase backend development environment..."

# Function to cleanup on exit
cleanup() {
    echo "\nShutting down..."
    kill $BACKEND_PID $WORKER_PID 2>/dev/null
    exit 0
}

# Set up trap for clean exit
trap cleanup EXIT INT TERM

# Start the backend server
echo "Starting backend server..."
npm run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 2

# Start the worker
echo "Starting agent task worker..."
npm run worker:dev &
WORKER_PID=$!

echo "Backend server PID: $BACKEND_PID"
echo "Worker PID: $WORKER_PID"
echo "Press Ctrl+C to stop all services"

# Wait for any process to exit
wait