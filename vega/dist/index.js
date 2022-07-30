"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const path_1 = __importDefault(require("path"));
const apollo_server_express_1 = require("apollo-server-express");
const schema_1 = require("@graphql-tools/schema");
const graphqlUploadExpress_js_1 = __importDefault(require("graphql-upload/graphqlUploadExpress.js"));
const jsonwebtoken_1 = require("jsonwebtoken");
const mongoose_1 = __importDefault(require("mongoose"));
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const typeDefs_1 = require("./graphql/typeDefs");
const middleware_1 = require("./graphql/middleware");
const User_1 = __importDefault(require("./models/User"));
const auth_1 = require("./util/auth");
const initServer = async () => {
    const app = express_1.default();
    app.set("trust proxy", process.env.NODE_ENV !== "production");
    const whitelist = process.env.NODE_ENV === "production" ? ["https://www.deveelo.com", "https://next.deveelo.com", "https://deveelo.vercel.app"] : ["http://localhost:3000"];
    const corsDefault = function (_req, callback) {
        var corsOptions = {
            origin: function (origin, callback) {
                if (!origin && process.env.NODE_ENV === "production") {
                    callback(new Error("Not allowed by CORS"));
                }
                if (whitelist.indexOf(origin) !== -1 || process.env.NODE_ENV !== "production") {
                    callback(null, true);
                }
                else {
                    let ori = origin;
                    if (ori.startsWith("https://deveelo-") && ori.endsWith("-treixatek.vercel.app")) {
                        callback(null, true);
                    }
                    else {
                        console.log("😡 Blocked origin " + origin);
                        callback(new Error("Not allowed by CORS"));
                    }
                }
            },
            credentials: true,
        };
        callback(null, corsOptions);
    };
    const corsAllowUndefined = function (req, callback) {
        var corsOptions;
        if (req.header("Origin") === undefined) {
            corsOptions = { origin: true };
        }
        else {
            corsOptions = { origin: false };
        }
        callback(null, corsOptions);
    };
    const corsAllowAll = function (_req, callback) {
        var corsOptions = { origin: true };
        callback(null, corsOptions);
    };
    app.use(cookie_parser_1.default());
    app.use(graphqlUploadExpress_js_1.default());
    app.get("/", cors_1.default(corsDefault), (_req, res) => res.send("hello"));
    app.get("/users", cors_1.default(corsAllowUndefined), async (_req, res) => {
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
            return res.send(results);
        }
        catch (error) {
            console.error(error);
            res.send([]);
        }
        return res.send([]);
    });
    app.get("/og", cors_1.default(corsAllowUndefined), async (req, res) => {
        if (!req.query.tag) {
            return res.send(null);
        }
        const tag = req.query.tag;
        const user = await User_1.default.aggregate([
            {
                $match: { "account.tag": { $eq: tag } },
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
                    "profile.friendIds": 0,
                    "profile.friendRqIds": 0,
                    "profile.badges": 0,
                    "profile.linkedProfiles": 0,
                    "social.groupIds": 0,
                    "social.betaIds": 0,
                    "social.chatIds": 0,
                },
            },
        ]);
        return res.send(user[0]);
    });
    app.get("/search", cors_1.default(corsAllowAll), async (req, res) => {
        if (req.query.name) {
            try {
                const results = await User_1.default.aggregate([
                    {
                        $search: {
                            index: "s_allusers",
                            compound: {
                                must: [
                                    {
                                        text: {
                                            query: req.query.name,
                                            path: {
                                                wildcard: "*",
                                            },
                                            fuzzy: {
                                                maxEdits: 2,
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    },
                    {
                        $limit: 6,
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
                            "profile.followingIds": 0,
                            "profile.followerIds": 0,
                            "profile.description": 0,
                            "profile.friendIds": 0,
                            "profile.friendRqIds": 0,
                            "profile.linkedProfiles": 0,
                            "profile.bannerUrl": 0,
                            social: 0,
                            score: { $meta: "searchScore" },
                        },
                    },
                ]);
                return res.send(results);
            }
            catch (error) {
                console.error(error);
                res.send([]);
            }
        }
        return res.send([]);
    });
    app.all("/graphql", cors_1.default(corsDefault));
    app.post("/refresh_token", cors_1.default(corsDefault), async (req, res) => {
        const token = req.cookies.lid;
        if (!token) {
            return res.send({ ok: false, accessToken: "" });
        }
        let payload = null;
        try {
            payload = jsonwebtoken_1.verify(token, process.env.REFRESH_TOEKEN_SECRET);
        }
        catch (error) {
            console.log(error);
            auth_1.sendRefreshToken(res, "");
            return res.send({ ok: false, accessToken: "" });
        }
        const user = await User_1.default.findById(payload.id);
        if (!user) {
            return res.send({ ok: false, accessToken: "" });
        }
        if (user.account.tokenVersion !== payload.tokenVersion) {
            auth_1.sendRefreshToken(res, "");
            return res.send({ ok: false, accessToken: "" });
        }
        auth_1.sendRefreshToken(res, auth_1.createRefreshToken(user));
        return res.send({ ok: true, accessToken: auth_1.createAccessToken(user) });
    });
    app.use("/uploads/pfps", express_1.default.static(path_1.default.join(__dirname, "../public/uploads/pfps")));
    app.use("/uploads/banners", express_1.default.static(path_1.default.join(__dirname, "../public/uploads/banners")));
    const schema = schema_1.makeExecutableSchema({
        typeDefs: typeDefs_1.typeDefs,
        resolvers: middleware_1.composedResolvers,
    });
    const server = new apollo_server_express_1.ApolloServer({
        schema: schema,
        context: ({ req, res }) => ({ req, res }),
    });
    await server.start();
    server.applyMiddleware({
        app,
        cors: false,
    });
    mongoose_1.default
        .connect(process.env.MONGODB_KEY, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
        .then(() => {
        console.log("📬 - database connected");
        return app.listen(parseInt(process.env.PORT), () => {
            console.log(`🚀 - Server running at http://localhost:4000`);
        });
    });
};
initServer().catch((err) => {
    console.log(err);
});
//# sourceMappingURL=index.js.map