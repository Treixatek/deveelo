"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToWebpClamped = exports.serveSizeBanner = exports.convertToWebpBanner = exports.convertToWebpPfp = void 0;
const sharp_1 = __importDefault(require("sharp"));
exports.convertToWebpPfp = sharp_1.default()
    .resize({
    width: 400,
    height: 400,
    fit: "cover",
})
    .webp({ quality: 75 });
exports.convertToWebpBanner = sharp_1.default()
    .resize({
    width: 990,
    height: 687,
    fit: "cover",
})
    .webp({ quality: 75 });
const serveSizeBanner = (file, w, h) => sharp_1.default(file).resize({
    width: w,
    height: h,
    fit: "cover",
});
exports.serveSizeBanner = serveSizeBanner;
exports.convertToWebpClamped = sharp_1.default()
    .metadata()
    .then(function (metadata) {
    if (metadata === undefined) {
        return sharp_1.default()
            .resize({
            width: 1936,
            height: 1090,
            fit: "cover",
        })
            .webp({ quality: 75 });
    }
    else {
        let newWidth = metadata.width;
        let newHeight = metadata.height;
        if (metadata.width > 1936) {
            newWidth = 1936;
        }
        if (metadata.height > 1090) {
            newHeight = 1090;
        }
        return sharp_1.default()
            .resize({
            width: newWidth,
            height: newHeight,
            fit: "cover",
        })
            .webp({ quality: 75 });
    }
});
//# sourceMappingURL=imageOpts.js.map