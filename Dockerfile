FROM rust:latest AS builder
WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY build.rs ./
COPY src ./src

RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/frixa /app/frixa
COPY --from=builder /app/src/ /app/src/

EXPOSE 8080

CMD ["./frixa"]
