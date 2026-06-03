IMAGE = drbh/hf-jobs-nix-instance
TAG = latest

.PHONY: build push

build:
	docker build --platform linux/amd64 -t $(IMAGE):$(TAG) .

push: build
	docker push $(IMAGE):$(TAG)
