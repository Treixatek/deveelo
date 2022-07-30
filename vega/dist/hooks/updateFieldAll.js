"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateField = void 0;
require("dotenv/config");
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const updateField = async () => {
    try {
        await User_1.default.updateMany({}, { $set: { "profile.bannerUrl": `/banners/image_${Math.floor(Math.random() * 4)}.webp` } });
        console.log(`📁 - Successfully changed field for all users`);
        return;
    }
    catch (error) {
        console.log(error);
        console.log(`⛔ - Error updating field`);
    }
};
exports.updateField = updateField;
mongoose_1.default
    .connect(process.env.MONGODB_KEY, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(async () => {
    await exports.updateField();
});
//# sourceMappingURL=updateFieldAll.js.map