IMAGE = ghcr.io/huggingface/kernel-builder-job
TAG = latest

.PHONY: build push

build:
	docker build --platform linux/amd64 -t $(IMAGE):$(TAG) docker/

push: build
	docker push $(IMAGE):$(TAG)
