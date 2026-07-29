# kernel-builder-job

GitHub Action to build kernels on HF Jobs infrastructure.

## Usage

```yaml
- uses: huggingface/kernel-builder-job@main
  with:
    token: ${{ secrets.HF_TOKEN }}
    namespace: your-username
    script: |
      kernel-builder init --name your-username/my-kernel --backends cuda
      cd my-kernel
      git init && git add -A && git commit -m init
      kernel-builder build
```

The default image ships `kernel-builder` on `PATH`. If you override `image` with
one that only has Nix, install the CLI first
(`nix profile install --accept-flake-config github:huggingface/kernels#kernel-builder`)
or call it ad-hoc with `nix run github:huggingface/kernels#kernel-builder -- ...`.

## Inputs

| Input       | Required | Default       | Description                                     |
| ----------- | -------- | ------------- | ----------------------------------------------- |
| `token`     | yes      |               | HF API token with `job.write` permission        |
| `namespace` | yes      |               | HF namespace (username or org)                  |
| `image`     | no       | `ghcr.io/huggingface/kernel-builder-job@sha256:...` | Docker image with nix + `kernel-builder` |
| `script`    | yes      |               | Shell script to run in the container            |
| `flavor`    | no       | `cpu-upgrade` | Hardware flavor (e.g. `t4-small`, `a10g-large`) |
| `timeout`   | no       | `1200`        | Max seconds to wait for completion              |

## Outputs

| Output    | Description                       |
| --------- | --------------------------------- |
| `job_id`  | HF Job ID                         |
| `job_url` | Link to the job on huggingface.co |

## Image builds

Changes under `docker/` are built by CI (`.github/workflows/build-image.yml`):
pull requests get a build-only validation, and pushes to `main` publish the
image to `ghcr.io/huggingface/kernel-builder-job` and open an automated PR
bumping the pinned digest in `action.yml`.
