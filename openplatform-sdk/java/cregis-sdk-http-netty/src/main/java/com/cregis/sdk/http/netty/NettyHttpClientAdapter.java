package com.cregis.sdk.http.netty;

import com.cregis.sdk.core.error.CregisSdkException;
import com.cregis.sdk.core.error.SdkErrorCode;
import com.cregis.sdk.core.http.HttpClient;
import com.cregis.sdk.core.http.HttpRequest;
import com.cregis.sdk.core.http.HttpResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.netty.bootstrap.Bootstrap;
import io.netty.buffer.Unpooled;
import io.netty.channel.*;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioSocketChannel;
import io.netty.handler.codec.http.*;
import io.netty.handler.codec.http.HttpHeaders;
import io.netty.util.CharsetUtil;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Netty-based async HTTP client.
 */
public class NettyHttpClientAdapter implements HttpClient {

    private final ObjectMapper objectMapper;
    private final int connectTimeoutSeconds;
    private final EventLoopGroup workerGroup;

    public NettyHttpClientAdapter(int connectTimeoutSeconds) {
        this.objectMapper = new ObjectMapper();
        this.connectTimeoutSeconds = connectTimeoutSeconds;
        this.workerGroup = new NioEventLoopGroup();
    }

    public NettyHttpClientAdapter() {
        this(10);
    }

    /**
     * Shutdown the event loop group. Call this when the application stops.
     */
    public void shutdown() {
        workerGroup.shutdownGracefully();
    }

    @Override
    public HttpResponse execute(HttpRequest request) throws CregisSdkException {
        CompletableFuture<HttpResponse> future = executeAsync(request);
        return future.join();
    }

    @Override
    @SuppressWarnings("unchecked")
    public CompletableFuture<HttpResponse> executeAsync(HttpRequest request) throws CregisSdkException {
        CompletableFuture<HttpResponse> future = new CompletableFuture<>();

        try {
            URI uri = new URI(request.getUrl());
            boolean ssl = "https".equalsIgnoreCase(uri.getScheme());
            int port = uri.getPort() != -1 ? uri.getPort() : (ssl ? 443 : 80);

            Bootstrap b = new Bootstrap();
            b.group(workerGroup)
                    .channel(NioSocketChannel.class)
                    .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, connectTimeoutSeconds * 1000)
                    .option(ChannelOption.SO_KEEPALIVE, true)
                    .handler(new ChannelInitializer<SocketChannel>() {
                        @Override
                        protected void initChannel(SocketChannel ch) {
                            ChannelPipeline p = ch.pipeline();
                            if (ssl) {
                                // SSL handler would be added here in production
                                // For now, plain HTTP
                            }
                            p.addLast(new HttpClientCodec());
                            p.addLast(new HttpObjectAggregator(10 * 1024 * 1024)); // 10MB
                            p.addLast(new SimpleChannelInboundHandler<FullHttpResponse>() {
                                @Override
                                protected void channelRead0(ChannelHandlerContext ctx, FullHttpResponse msg) {
                                    Map<String, String> headers = new HashMap<>();
                                    for (Map.Entry<String, String> entry : msg.headers()) {
                                        headers.put(entry.getKey(), entry.getValue());
                                    }
                                    String body = msg.content().toString(CharsetUtil.UTF_8);

                                    future.complete(HttpResponse.builder()
                                            .statusCode(msg.status().code())
                                            .headers(headers)
                                            .body(body)
                                            .build());
                                    ctx.close();
                                }

                                @Override
                                public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
                                    future.completeExceptionally(new CregisSdkException(
                                            SdkErrorCode.HTTP_ERROR,
                                            "Netty HTTP request failed: " + cause.getMessage(),
                                            cause));
                                    ctx.close();
                                }
                            });
                        }
                    });

            HttpRequest nettyRequest = new DefaultFullHttpRequest(
                    HttpVersion.HTTP_1_1,
                    HttpMethod.POST,
                    uri.getRawPath() + (uri.getRawQuery() != null ? "?" + uri.getRawQuery() : ""),
                    request.getBody() != null
                            ? Unpooled.copiedBuffer(request.getBody(), CharsetUtil.UTF_8)
                            : Unpooled.EMPTY_BUFFER);

            nettyRequest.headers().set(HttpHeaderNames.HOST, uri.getHost());
            nettyRequest.headers().set(HttpHeaderNames.CONNECTION, HttpHeaderValues.CLOSE);
            nettyRequest.headers().set(HttpHeaderNames.CONTENT_TYPE, "application/json; charset=utf-8");
            if (request.getBody() != null) {
                nettyRequest.headers().setInt(HttpHeaderNames.CONTENT_LENGTH,
                        request.getBody().getBytes(CharsetUtil.UTF_8).length);
            }

            request.getHeaders().forEach(nettyRequest.headers()::set);

            ChannelFuture cf = b.connect(uri.getHost(), port).sync();
            cf.channel().writeAndFlush(nettyRequest);

        } catch (Exception e) {
            future.completeExceptionally(new CregisSdkException(
                    SdkErrorCode.HTTP_ERROR,
                    "Failed to execute HTTP request: " + e.getMessage(),
                    e));
        }

        return future;
    }

    @Override
    @SuppressWarnings("unchecked")
    public <T> T post(String url, String body, Class<T> responseType) throws CregisSdkException {
        HttpRequest request = HttpRequest.builder()
                .method("POST")
                .url(url)
                .body(body)
                .build();
        HttpResponse response = execute(request);
        return parseResponse(response, responseType);
    }

    @Override
    public <T> CompletableFuture<T> postAsync(String url, String body, Class<T> responseType) {
        HttpRequest request = HttpRequest.builder()
                .method("POST")
                .url(url)
                .body(body)
                .build();
        return executeAsync(request).thenApply(resp -> parseResponse(resp, responseType));
    }

    @SuppressWarnings("unchecked")
    private <T> T parseResponse(HttpResponse response, Class<T> responseType) {
        try {
            JsonNode rootNode = objectMapper.readTree(response.getBody());
            int code = rootNode.has("code") ? rootNode.get("code").asInt() : -1;
            String message = rootNode.has("message") ? rootNode.get("message").asText() : "Unknown error";
            String traceId = rootNode.has("traceId") ? rootNode.get("traceId").asText() : null;

            if (code != 0) {
                throw CregisSdkException.fromApiResponse(code, message, response.getStatusCode(), traceId);
            }

            JsonNode dataNode = rootNode.get("data");
            if (dataNode == null || dataNode.isNull()) {
                return null;
            }
            return objectMapper.treeToValue(dataNode, responseType);
        } catch (JsonProcessingException e) {
            throw new CregisSdkException(SdkErrorCode.API_ERROR,
                    "Failed to parse response: " + e.getMessage(), e);
        }
    }
}
