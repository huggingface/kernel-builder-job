FROM registry.access.redhat.com/ubi8/ubi:latest

# Link the GHCR package to this repo
LABEL org.opencontainers.image.source="https://github.com/huggingface/kernel-builder-job"

# Install dependencies needed for Nix installer
RUN dnf install -y \
        curl \
        xz \
        shadow-utils \
        tar \
        gzip \
        ca-certificates \
    && dnf clean all

# Point Nix/curl at the system CA bundle; set USER for cachix
ENV NIX_SSL_CERT_FILE=/etc/pki/tls/certs/ca-bundle.crt
ENV SSL_CERT_FILE=/etc/pki/tls/certs/ca-bundle.crt
ENV USER=root

# Create nix build user and group (required by multi-user Nix install)
RUN groupadd -r nixbld \
    && for i in $(seq 1 10); do \
         useradd -r -g nixbld -G nixbld -d /var/empty -s /sbin/nologin "nixbld$i"; \
       done \
    && mkdir -m 0755 /nix \
    && chown root:root /nix

# Pre-create nix config to disable sandbox/seccomp before install (needed for cross-arch builds)
RUN mkdir -p /etc/nix \
    && echo "sandbox = false" >> /etc/nix/nix.conf \
    && echo "filter-syscalls = false" >> /etc/nix/nix.conf

# Install Nix in single-user mode
RUN curl -L https://nixos.org/nix/install | sh -s -- --no-daemon \
    && ln -s /root/.nix-profile/bin/nix /usr/local/bin/nix \
    && ln -s /root/.nix-profile/bin/nix-env /usr/local/bin/nix-env \
    && ln -s /root/.nix-profile/bin/nix-store /usr/local/bin/nix-store \
    && ln -s /root/.nix-profile/bin/nix-channel /usr/local/bin/nix-channel

# Source nix profile in all shells
ENV NIX_PATH=/root/.nix-defexpr/channels
ENV PATH="/root/.nix-profile/bin:${PATH}"

# Configure Nix: enable flakes and install tools
RUN echo "experimental-features = nix-command flakes" >> /etc/nix/nix.conf \
    && nix profile install nixpkgs#cachix nixpkgs#git nixpkgs#git-lfs nixpkgs#jq \
    && cachix use huggingface

# Install kernel-builder so that jobs can call it as a CLI (`kernel-builder
# build-and-upload ...`) instead of `nix run`. This also pre-fetches the flake,
# so nothing has to be resolved at job start-up.
ARG KERNEL_BUILDER_REF=github:huggingface/kernels
RUN nix profile install --accept-flake-config "${KERNEL_BUILDER_REF}#kernel-builder" \
    && ln -s /root/.nix-profile/bin/kernel-builder /usr/local/bin/kernel-builder \
    && kernel-builder --version

# Remove build-time sandbox overrides so runtime gets sandbox = true (required by kernel-builder)
RUN sed -i '/^sandbox = false$/d; /^filter-syscalls = false$/d' /etc/nix/nix.conf
