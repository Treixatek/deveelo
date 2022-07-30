"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const imageOpts_1 = require("../../util/imageOpts");
const validators_1 = require("../../util/validators");
const apollo_server_express_1 = require("apollo-server-express");
const User_1 = __importDefault(require("../../models/User"));
const contentDir = "public/uploads/";
let uploadedPfps;
let uploadedBanners;
fs_1.default.readdir(contentDir + "pfps/", (err, files) => {
    if (err) {
        console.log(`Error fetching all pfp file names from dir: ${contentDir} \n The error was: \n ${err}`);
    }
    else {
        uploadedPfps !== null && uploadedPfps !== void 0 ? uploadedPfps : (uploadedPfps = files);
        console.log("🦄 Profile picture filenames fetched and saved");
    }
});
fs_1.default.readdir(contentDir + "banners/", (err, files) => {
    if (err) {
        console.log(`Error fetching all banner file names from dir: ${contentDir} \n The error was: \n ${err}`);
    }
    else {
        uploadedBanners !== null && uploadedBanners !== void 0 ? uploadedBanners : (uploadedBanners = files);
        console.log("🍧 Banner filenames fetched and saved");
    }
});
const uploadsResolvers = {
    Mutation: {
        singleUpload: async (_parent, { file, type }, { payload }) => {
            let savePath;
            let imageOptimization;
            switch (type) {
                case "pfp":
                    imageOptimization = imageOpts_1.convertToWebpPfp;
                    savePath = contentDir + "pfps";
                    break;
                case "banner":
                    imageOptimization = imageOpts_1.convertToWebpBanner;
                    savePath = contentDir + "banners";
                    break;
                default:
                    throw new Error("No valid type --banner, pfp, etc-- passed in as a prop with this upload");
            }
            const { createReadStream, filename, mimetype, encoding } = await file;
            const name = filename;
            const extension = name.split(".")[1];
            const { errors, valid } = validators_1.validateFileExtensions(extension, ["png", "jpg", "jpeg", "webp", "jfif", "avif"]);
            if (!valid) {
                throw new apollo_server_express_1.UserInputError(errors.file);
            }
            const saveName = `${payload === null || payload === void 0 ? void 0 : payload.id}.webp`;
            try {
                if (type === "pfp") {
                    await User_1.default.findByIdAndUpdate(payload.id, { $set: { "profile.pictureUrl": `/pfps/${saveName}` } }, { useFindAndModify: false });
                }
                else if (type === "banner") {
                    await User_1.default.findByIdAndUpdate(payload.id, { $set: { "profile.bannerUrl": `/banners/${saveName}` } }, { useFindAndModify: false });
                }
            }
            catch (err) {
                throw new Error("Error finding and updating user's pfp or banner image on new upload");
            }
            await new Promise((res) => createReadStream()
                .pipe(imageOptimization)
                .pipe(fs_1.default.createWriteStream(path_1.default.join(savePath, saveName)))
                .on("close", res));
            switch (type) {
                case "pfp":
                    if (!uploadedPfps.includes(saveName)) {
                        uploadedPfps.push(saveName);
                    }
                    break;
                case "banner":
                    if (!uploadedBanners.includes(saveName)) {
                        uploadedBanners.push(saveName);
                    }
                    break;
                default:
                    throw new Error("Error when saving new file name to variable array storage of uploaded files");
            }
            return {
                filename: saveName,
                mimetype: mimetype,
                encoding: encoding,
            };
        },
    },
};
exports.default = uploadsResolvers;
//# sourceMappingURL=uploads.js.map