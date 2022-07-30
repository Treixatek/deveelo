import "dotenv/config";
import path from "path";
import { ApolloServer } from "apollo-server-express";
import { makeExecutableSchema } from "@graphql-tools/schema";
//@ts-ignore
import graphqlUploadExpress from "graphql-upload/graphqlUploadExpress.js";
import { verify } from "jsonwebtoken";
import mongoose from "mongoose";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import { typeDefs } from "./graphql/typeDefs";
import { composedResolvers } from "./graphql/middleware";
import User, { UserType } from "./models/User";
import { createAccessToken, createRefreshToken, sendRefreshToken } from "./util/auth";

// development  change mongodb user password & access
const initServer = async () => {
	const app = express();
	app.set("trust proxy", process.env.NODE_ENV !== "production");

	const whitelist = process.env.NODE_ENV === "production" ? ["https://www.deveelo.com", "https://next.deveelo.com", "https://deveelo.vercel.app"] : ["http://localhost:3000"];

	//used for protected routes
	const corsDefault = function (_req: any, callback: any) {
		var corsOptions = {
			origin: function (origin: any, callback: any) {
				//console.log("Attempt to connect w/ origin " + origin);
				//console.log(process.env.NODE_ENV);

				if (!origin && process.env.NODE_ENV === "production") {
					//console.log("😡 Blocked origin " + origin);

					callback(new Error("Not allowed by CORS"));
				}

				//DO NOT EVER CHANGE
				if (whitelist.indexOf(origin!) !== -1 || process.env.NODE_ENV !== "production") {
					//|| process.env.NODE_ENV !== "production" - allows gql code gen
					//console.log(`😃 origin "${origin}" in the whitelist`);

					callback(null, true);
				} else {
					let ori: string = origin;
					if (ori.startsWith("https://deveelo-") && ori.endsWith("-treixatek.vercel.app")) {
						//these are vercel preview builds
						//console.log("📜 Exception allowed for origin " + origin);

						callback(null, true);
					} else {
						console.log("😡 Blocked origin " + origin);

						callback(new Error("Not allowed by CORS"));
					}
				}
			},
			credentials: true,
		};

		callback(null, corsOptions); // callback expects two parameters: error and options
	};

	//used for public data, allows viewing
	const corsAllowUndefined = function (req: any, callback: any) {
		var corsOptions;
		if (req.header("Origin") === undefined) {
			corsOptions = { origin: true };

			//allow through
		} else {
			corsOptions = { origin: false };
			//block
		}
		callback(null, corsOptions); // callback expects two parameters: error and options
	};

	const corsAllowAll = function (_req: any, callback: any) {
		var corsOptions = { origin: true };
		callback(null, corsOptions); // callback expects two parameters: error and options
	};

	//apply miscellanious .use middleware
	//allows for reading of browser cookie information, for auth
	app.use(cookieParser());
	//used to allow file uploads
	app.use(graphqlUploadExpress());

	//api routes
	app.get("/", cors(corsDefault), (_req, res) => res.send("hello"));

	app.get("/users", cors(corsAllowUndefined), async (_req, res) => {
		//find all public accounts
		try {
			const results = await User.aggregate([
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
		} catch (error) {
			console.error(error);
			res.send([]);
		}
		return res.send([]);
	});

	//find user fields for social share meta tags
	app.get("/og", cors(corsAllowUndefined), async (req, res) => {
		if (!req.query.tag) {
			return res.send(null);
		}

		const tag = req.query.tag;
		const user = await User.aggregate([
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

	//searchbar
	app.get("/search", cors(corsAllowAll), async (req, res) => {
		if (req.query.name) {
			try {
				const results = await User.aggregate([
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
			} catch (error) {
				console.error(error);
				res.send([]);
			}
		}
		return res.send([]);
	});

	app.all("/graphql", cors(corsDefault));

	//gen new refresh tokens
	app.post("/refresh_token", cors(corsDefault), async (req, res) => {
		//check if refresh token is correct & send new access token
		const token = req.cookies.lid;
		if (!token) {
			//they are not signed in
			return res.send({ ok: false, accessToken: "" });
		}

		let payload: any = null;
		try {
			payload = verify(token, process.env.REFRESH_TOEKEN_SECRET!);
		} catch (error) {
			console.log(error);
			sendRefreshToken(res, "");
			return res.send({ ok: false, accessToken: "" });
		}

		//token is valid, send access token
		const user: UserType = await User.findById(payload.id);

		if (!user) {
			return res.send({ ok: false, accessToken: "" });
		}

		//check if token version is the latest
		if (user.account.tokenVersion !== payload.tokenVersion) {
			sendRefreshToken(res, "");
			return res.send({ ok: false, accessToken: "" });
		}

		//refresh the refresh token
		sendRefreshToken(res, createRefreshToken(user));

		//login the user (send access token)
		return res.send({ ok: true, accessToken: createAccessToken(user) });
	});

	//send the images when route is loaded
	app.use("/uploads/pfps", express.static(path.join(__dirname, "../public/uploads/pfps")));
	app.use("/uploads/banners", express.static(path.join(__dirname, "../public/uploads/banners")));

	const schema = makeExecutableSchema({
		typeDefs,
		resolvers: composedResolvers,
	});

	const server = new ApolloServer({
		schema: schema,
		context: ({ req, res }) => ({ req, res }),
	});

	await server.start();

	server.applyMiddleware({
		app,
		cors: false,
	});

	//connect to the mongodb database
	mongoose
		.connect(process.env.MONGODB_KEY!, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		})
		.then(() => {
			console.log("📬 - database connected");
			return app.listen(parseInt(process.env.PORT!), () => {
				console.log(`🚀 - Server running at http://localhost:4000`);
			});
		});
};

initServer().catch((err) => {
	console.log(err);
});
