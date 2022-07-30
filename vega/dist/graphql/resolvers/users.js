"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const argon2_1 = __importDefault(require("argon2"));
const apollo_server_express_1 = require("apollo-server-express");
const mongodb_1 = require("mongodb");
const validators_1 = __importDefault(require("../../util/validators"));
const User_1 = __importDefault(require("../../models/User"));
const auth_1 = require("../../util/auth");
const sampleUsers_1 = require("../../hooks/sampleUsers");
const successfulLoginHandler = (user, { res }) => {
    auth_1.sendRefreshToken(res, auth_1.createRefreshToken(user));
    return auth_1.createAccessToken(user);
};
const userResolvers = {
    Query: {
        myAccount: async (_parent, _args, context) => {
            const user = await User_1.default.findById(new mongodb_1.ObjectID(context.payload.id));
            if (!user) {
                throw new Error("user not found");
            }
            return user;
        },
        findUserByTag: async (_parent, { tag }, _context) => {
            const user = await User_1.default.findOne({ "account.tag": tag });
            if (!user) {
                throw new Error("user not found");
            }
            return user;
        },
        findUsersById: async (_parent, { ids }, _context) => {
            let users = [];
            for (let i = 0; i < ids.length; i++) {
                const id = ids[i];
                const user = await User_1.default.findById(new mongodb_1.ObjectID(id));
                if (user !== null) {
                    users.push(user);
                }
            }
            if (users.length === 0) {
                throw new Error("No users found w/ given id list");
            }
            return users;
        },
        randomUser: async (_parent, _args, _context) => {
            const user = await sampleUsers_1.getRandomUser(false);
            if (!user) {
                throw new Error("error finding random user");
            }
            return user;
        },
        randomUsers: async (_parent, { count }, _context) => {
            const users = await sampleUsers_1.getRandomUsers(count);
            if (!users) {
                throw new Error("Error sampling users");
            }
            return users;
        },
        allUsers: async (_parent, _args, _context) => {
            try {
                const results = await User_1.default.aggregate([
                    {
                        $match: { "account.private": { $eq: false } },
                    },
                    {
                        $project: {
                            _id: 0,
                            "account.password": 0,
                            "account.email": 0,
                            "account.blockedIds": 0,
                            "account.tokenVersion": 0,
                            "account.pro": 0,
                            "account.short": 0,
                            profile: 0,
                            social: 0,
                        },
                    },
                ]);
                return results;
            }
            catch (error) {
                throw new Error(error);
            }
        },
    },
    Mutation: {
        follow: async (_parent, { id }, context) => {
            const myID = context.payload.id;
            try {
                await User_1.default.findByIdAndUpdate(new mongodb_1.ObjectID(myID), { $addToSet: { "profile.followingIds": id } }, { useFindAndModify: false });
                await User_1.default.findByIdAndUpdate(new mongodb_1.ObjectID(id), { $addToSet: { "profile.followerIds": myID } }, { useFindAndModify: false });
                return {
                    success: true,
                };
            }
            catch (error) {
                throw new Error(error);
            }
        },
        unfollow: async (_parent, { id }, context) => {
            const myID = context.payload.id;
            try {
                await User_1.default.findByIdAndUpdate(new mongodb_1.ObjectID(myID), { $pull: { "profile.followingIds": id } }, { useFindAndModify: false });
                await User_1.default.findByIdAndUpdate(new mongodb_1.ObjectID(id), { $pull: { "profile.followerIds": myID } }, { useFindAndModify: false });
                return {
                    success: true,
                };
            }
            catch (error) {
                throw new Error(error);
            }
        },
        updateProfile: async (_parent, { name, tag, description }, context) => {
            let user = await User_1.default.findById(new mongodb_1.ObjectID(context.payload.id));
            if (!user) {
                throw new Error("account not found");
            }
            const newName = name === null ? user.account.username : name;
            const newTag = tag === null ? user.account.tag : tag;
            const newDes = description === null ? user.profile.description : description;
            const newBanner = user.profile.bannerUrl;
            const newPfp = user.profile.pictureUrl;
            try {
                await User_1.default.findByIdAndUpdate(new mongodb_1.ObjectID(context.payload.id), {
                    $set: {
                        "account.username": newName,
                        "account.tag": newTag,
                        "profile.description": newDes,
                        "profile.bannerUrl": newBanner,
                        "profile.pictureUrl": newPfp,
                    },
                }, { useFindAndModify: false });
                user.account.username = newName;
                user.account.tag = newTag;
                user.profile.description = newDes;
                user.profile.bannerUrl = newBanner;
                user.profile.pictureUrl = newPfp;
                return user;
            }
            catch (error) {
                throw new Error(error);
            }
        },
        login: async (_, { input, password }, context) => {
            const regEx = /^([0-9a-zA-Z]([-.\w]*[0-9a-zA-Z])*@([0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.)+[a-zA-Z]{2,9})$/;
            const isEmail = input.match(regEx);
            if (isEmail) {
                let { valid, errors } = validators_1.default(input, "email");
                if (!valid) {
                    throw new apollo_server_express_1.UserInputError("Errors", { errors });
                }
            }
            else {
                let { valid, errors } = validators_1.default(input, "username");
                if (!valid) {
                    throw new apollo_server_express_1.UserInputError("Errors", { errors });
                }
            }
            let { valid, errors } = validators_1.default(password, "password");
            if (!valid) {
                throw new apollo_server_express_1.UserInputError("Errors", { errors });
            }
            let user;
            if (isEmail) {
                user = await User_1.default.findOne({ "account.email": input });
            }
            else {
                user = await User_1.default.findOne({ "account.tag": input });
            }
            if (!user) {
                if (isEmail) {
                    throw new apollo_server_express_1.UserInputError("User not found", {
                        errors: {
                            email: "no user is registered with this email",
                        },
                    });
                }
                else {
                    throw new apollo_server_express_1.UserInputError("User not found", {
                        errors: {
                            username: "no user is registered with this username",
                        },
                    });
                }
            }
            const match = await argon2_1.default.verify(user.account.password, password);
            if (!match) {
                throw new apollo_server_express_1.UserInputError("Wrong credentials", {
                    errors: {
                        password: "incorrect password",
                    },
                });
            }
            await User_1.default.findByIdAndUpdate(user._id, { $set: { status: "online" } }, { useFindAndModify: false });
            return {
                accessToken: successfulLoginHandler(user, context),
                user,
            };
        },
        register: async (_, { email, password }, context) => {
            email = String(email).trim();
            let { valid, errors } = validators_1.default(email, "email");
            if (!valid) {
                throw new apollo_server_express_1.UserInputError("Errors", { errors });
            }
            let emailSplit = String(email).split("@");
            let username = String(emailSplit[0].trim()).replaceAll("@", "");
            ({ valid, errors } = validators_1.default(username, "username"));
            if (!valid) {
                throw new apollo_server_express_1.UserInputError("Errors", { errors });
            }
            let tag = username;
            ({ valid, errors } = validators_1.default(password, "password"));
            if (!valid) {
                throw new apollo_server_express_1.UserInputError("Errors", { errors });
            }
            let max = 9;
            const CheckAndGenerateUsername = async (length, testTag, repeat, cycleNum) => {
                const matchUser = await User_1.default.findOne({
                    "account.tag": testTag,
                });
                if (matchUser) {
                    if (repeat) {
                        testTag = tag;
                    }
                    testTag += Math.floor(Math.random() * length) + 1;
                    if (max < 999 || cycleNum > 10) {
                        max = parseInt(`${max}${9}`);
                    }
                    return await CheckAndGenerateUsername(max, testTag, true, cycleNum++);
                }
                tag = testTag;
                return;
            };
            await CheckAndGenerateUsername(max, tag, false, 0);
            const muser = await User_1.default.findOne({ "account.email": email });
            if (muser) {
                throw new apollo_server_express_1.UserInputError("email taken", {
                    errors: {
                        email: "An account is already registered with email",
                    },
                });
            }
            password = await argon2_1.default.hash(password, {
                type: argon2_1.default.argon2id,
                hashLength: 41,
            });
            await User_1.default.init();
            const newUser = new User_1.default({
                account: {
                    username: username,
                    tag: tag,
                    short: "",
                    password: password,
                    email: email,
                    createdAt: new Date().toISOString(),
                    lastOnline: new Date().toISOString(),
                    private: false,
                    blockedIds: [],
                    pro: false,
                },
                profile: {
                    bannerUrl: `/banners/image_${Math.floor(Math.random() * 4)}.webp`,
                    pictureUrl: `/user_content/p_pictures/cup${Math.floor(Math.random() * 18)}.jpg`,
                    description: "I'm new to Deveelo!",
                    followingIds: [],
                    followerIds: [],
                    friendIds: [],
                    friendRqIds: [],
                    badges: [],
                    linkedProfiles: [],
                },
                status: "online",
                social: {
                    postIds: [],
                    blogIds: [],
                    groupIds: [],
                    betaIds: {
                        hostedIds: [],
                        joinedIds: [],
                    },
                    chatIds: [],
                },
            });
            try {
                await newUser.save();
            }
            catch (error) {
                throw new Error("Unable to save user to database");
            }
            const user = newUser;
            return {
                accessToken: successfulLoginHandler(newUser, context),
                user,
            };
        },
        logout: async (_parent, _args, { res, payload }) => {
            if (!payload) {
                console.log(JSON.stringify(payload));
                return false;
            }
            try {
                await User_1.default.findByIdAndUpdate(payload.id, { $set: { status: "offline" } }, { useFindAndModify: false });
                auth_1.sendRefreshToken(res, "");
                return true;
            }
            catch (error) {
                throw new Error(error);
            }
        },
    },
};
exports.default = userResolvers;
//# sourceMappingURL=users.js.map