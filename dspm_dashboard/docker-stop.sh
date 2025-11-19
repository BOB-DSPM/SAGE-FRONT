#!/bin/sh
set -e

CONTAINER_NAME=${1:-sage-front}

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  docker stop "$CONTAINER_NAME"
  docker rm "$CONTAINER_NAME"
else
  echo "Container \"$CONTAINER_NAME\" does not exist."
fi
