FROM alpine:3.21

RUN apk add --no-cache \
      lua5.4 lua5.4-dev lua5.4-libs \
      luarocks5.4 \
      gcc musl-dev make && \
    luarocks-5.4 install fennel && \
    luarocks-5.4 install luasocket

WORKDIR /mud
COPY engine/ .

EXPOSE 4242

CMD ["fennel", "run.fnl"]
