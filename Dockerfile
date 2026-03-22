FROM alpine:latest
ARG PB_VERSION=0.22.6
RUN apk add --no-cache unzip ca-certificates openssh
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/
COPY ./pb_public /pb/pb_public
COPY ./pb_hooks /pb/pb_hooks
EXPOSE 8080
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080"]