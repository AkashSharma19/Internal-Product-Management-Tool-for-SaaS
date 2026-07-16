#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-ap-south-1}"
ECR_REGISTRY="${ECR_REGISTRY:-770014814665.dkr.ecr.ap-south-1.amazonaws.com}"
ECR_REPOSITORY="${ECR_REPOSITORY:-akash_ipmt}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE_URI="${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"

aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

docker build -t "${IMAGE_URI}" .
docker push "${IMAGE_URI}"

echo "Pushed ${IMAGE_URI}"
