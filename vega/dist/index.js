"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const apollo_server_express_1 = require("apollo-server-express");
const graphql_middleware_1 = require("graphql-middleware");
const schema_1 = require("@graphql-tools/schema");
const jsonwebtoken_1 = require("jsonwebtoken");
const mongoose_1 = __importDefault(require("mongoose"));
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const typeDefs_1 = require("./graphql/typeDefs");
const resolvers_1 = __importDefault(require("./graphql/resolvers"));
const middleware_1 = require("./graphql/middleware");
const User_1 = __importDefault(require("./models/User"));
const auth_1 = require("./util/auth");
const initServer = async () => {
    const app = express_1.default();
    const whitelist = process.env.NODE_ENV === "production" ? ["https://www.deveelo.com", "https://next.deveelo.com", "https://deveelo.vercel.app"] : ["http://localhost:3000"];
    const corsDefault = function (_req, callback) {
        var corsOptions = {
            origin: function (origin, callback) {
                console.log("Attempt to connect w/ origin " + origin);
                if (!origin) {
                    console.log("😡 Blocked origin " + origin);
                    callback(new Error("Not allowed by CORS"));
                }
                if (whitelist.indexOf(origin) !== -1 || process.env.NODE_ENV !== "production") {
                    console.log(`😃 origin "${origin}" in the whitelist`);
                    callback(null, true);
                }
                else {
                    let ori = origin;
                    if ((ori.startsWith("https://deveelo-") && ori.endsWith("-treixatek.vercel.app")) || (ori.startsWith("deveelo-") && ori.endsWith("-treixatek.vercel.app"))) {
                        console.log("📜 Exception allowed for origin " + origin);
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
    app.use(cookie_parser_1.default());
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
    app.get("/search", cors_1.default(corsAllowUndefined), async (req, res) => {
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
                                                maxEdits: 1,
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
                            profile: 0,
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
    const schema = schema_1.makeExecutableSchema({
        typeDefs: typeDefs_1.typeDefs,
        resolvers: resolvers_1.default,
    });
    const middleware = [...middleware_1.authMiddlewares];
    const schemaWithMiddleware = graphql_middleware_1.applyMiddleware(schema, ...middleware);
    const server = new apollo_server_express_1.ApolloServer({
        schema: schemaWithMiddleware,
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