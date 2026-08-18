/**
 * 接口状态码
 */
export var ApiStatus;
(function (ApiStatus) {
    ApiStatus[ApiStatus["success"] = 0] = "success";
    ApiStatus[ApiStatus["error"] = 400] = "error";
    ApiStatus[ApiStatus["unauthorized"] = 401] = "unauthorized";
    ApiStatus[ApiStatus["forbidden"] = 403] = "forbidden";
    ApiStatus[ApiStatus["notFound"] = 404] = "notFound";
    ApiStatus[ApiStatus["methodNotAllowed"] = 405] = "methodNotAllowed";
    ApiStatus[ApiStatus["requestTimeout"] = 408] = "requestTimeout";
    ApiStatus[ApiStatus["internalServerError"] = 500] = "internalServerError";
    ApiStatus[ApiStatus["notImplemented"] = 501] = "notImplemented";
    ApiStatus[ApiStatus["badGateway"] = 502] = "badGateway";
    ApiStatus[ApiStatus["serviceUnavailable"] = 503] = "serviceUnavailable";
    ApiStatus[ApiStatus["gatewayTimeout"] = 504] = "gatewayTimeout";
    ApiStatus[ApiStatus["httpVersionNotSupported"] = 505] = "httpVersionNotSupported"; // HTTP版本不支持
})(ApiStatus || (ApiStatus = {}));
//# sourceMappingURL=status.js.map