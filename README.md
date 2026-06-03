# kernel-builder-job

GitHub Action to build kernels on HF Jobs infrastructure.

## Usage

```yaml
- uses: huggingface/kernel-builder-job@main
  with:
    token: ${{ secrets.HF_TOKEN }}
    namespace: your-username
    script: |
      nix run github:huggingface/kernels#kernel-builder -- init --name your-username/my-kernel --backends cuda
      cd my-kernel
      git init && git add -A && git commit -m init
      nix run github:huggingface/kernels#kernel-builder -- build
```

## Inputs

| Input       | Required | Default       | Description                                     |
| ----------- | -------- | ------------- | ----------------------------------------------- |
| `token`     | yes      |               | HF API token with `job.write` permission        |
| `namespace` | yes      |               | HF namespace (username or org)                  |
| `image`     | no       | `drbh/hf-jobs-nix-instance@sha256:...` | Docker image with nix + cachix |
| `script`    | yes      |               | Shell script to run in the container            |
| `flavor`    | no       | `cpu-upgrade` | Hardware flavor (e.g. `t4-small`, `a10g-large`) |
| `timeout`   | no       | `1200`        | Max seconds to wait for completion              |

## Outputs

| Output    | Description                       |
| --------- | --------------------------------- |
| `job_id`  | HF Job ID                         |
| `job_url` | Link to the job on huggingface.co |
