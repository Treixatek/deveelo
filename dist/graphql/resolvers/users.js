"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const argon2_1 = __importDefault(require("argon2"));
const apollo_server_errors_1 = require("apollo-server-errors");
const mongodb_1 = require("mongodb");
const validators_1 = __importDefault(require("../../util/validators"));
const User_1 = __importDefault(require("../../models/User"));
const auth_1 = require("../../util/auth");
const successfulLoginHandler = (user, { res }) => {
    auth_1.sendRefreshToken(res, auth_1.createRefreshToken(user));
    return auth_1.createAccessToken(user);
};
const userResolvers = {
    Query: {
        async myAccount(_parent, _args, context) {
            const user = await User_1.default.findById(new mongodb_1.ObjectID(context.payload.id));
            if (!user) {
                throw new Error("user not found");
            }
            return user;
        },
    },
    Mutation: {
        async login(_, { input, password }, context) {
            const regEx = /^([0-9a-zA-Z]([-.\w]*[0-9a-zA-Z])*@([0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.)+[a-zA-Z]{2,9})$/;
            const isEmail = input.match(regEx);
            if (isEmail) {
                let { valid, errors } = validators_1.default(input, "email");
                if (!valid) {
                    throw new apollo_server_errors_1.UserInputError("Errors", { errors });
                }
            }
            else {
                let { valid, errors } = validators_1.default(input, "username");
                if (!valid) {
                    throw new apollo_server_errors_1.UserInputError("Errors", { errors });
                }
            }
            let { valid, errors } = validators_1.default(password, "password");
            if (!valid) {
                throw new apollo_server_errors_1.UserInputError("Errors", { errors });
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
                    throw new apollo_server_errors_1.UserInputError("User not found", {
                        errors: {
                            general: "no user is registered with this email",
                        },
                    });
                }
                else {
                    throw new apollo_server_errors_1.UserInputError("User not found", {
                        errors: {
                            general: "no user is registered with this username",
                        },
                    });
                }
            }
            const match = await argon2_1.default.verify(user.account.password, password);
            if (!match) {
                throw new apollo_server_errors_1.UserInputError("Wrong credentials", {
                    errors: {
                        general: "incorrect password",
                    },
                });
            }
            return {
                accessToken: successfulLoginHandler(user, context),
            };
        },
        async register(_, { registerInput: { password, email } }, context) {
            email = String(email).trim();
            let { valid, errors } = validators_1.default(email, "email");
            if (!valid) {
                throw new apollo_server_errors_1.UserInputError("Errors", { errors });
            }
            let emailSplit = String(email).split("@");
            let username = String(emailSplit[0].trim()).replaceAll("@", "");
            ({ valid, errors } = validators_1.default(username, "username"));
            if (!valid) {
                throw new apollo_server_errors_1.UserInputError("Errors", { errors });
            }
            let tag = username;
            ({ valid, errors } = validators_1.default(password, "password"));
            if (!valid) {
                throw new apollo_server_errors_1.UserInputError("Errors", { errors });
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
            const user = await User_1.default.findOne({ "account.email": email });
            if (user) {
                throw new apollo_server_errors_1.UserInputError("email taken", {
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
                    bannerUrl: "default",
                    pictureUrl: "default",
                    description: "I'm new to Deveelo!",
                    followingIds: [],
                    followerIds: [],
                    friendIds: [],
                    friendRqIds: [],
                    badges: [],
                    linkedProfiles: [],
                },
                status: "online",
                Social: {
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
            return {
                accessToken: successfulLoginHandler(newUser, context),
            };
        },
    },
};
exports.default = userResolvers;
//# sourceMappingURL=users.js.map