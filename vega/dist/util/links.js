"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServerUrl = exports.devServerUrl = exports.prodServerUrl = void 0;
exports.prodServerUrl = "https://vega-deployment.herokuapp.com/";
exports.devServerUrl = "http://localhost:4000/";
const getServerUrl = (path) => {
    const route = path ? path : "";
    return process.env.NODE_ENV === "production" ? exports.prodServerUrl + route : exports.devServerUrl + route;
};
exports.getServerUrl = getServerUrl;
//# sourceMappingURL=links.js.map