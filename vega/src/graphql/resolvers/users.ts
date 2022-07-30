import argon2 from "argon2";
import { UserInputError } from "apollo-server-express";
import { ObjectID } from "mongodb";

import ValidateRegisterInput from "../../util/validators";
import User, { UserType } from "../../models/User";
import { EditProfInput } from "../resolverTypes";
import Context from "../../context";
import { createAccessToken, createRefreshToken, sendRefreshToken } from "../../util/auth";
import { Document } from "mongoose";
import { getRandomUser, getRandomUsers } from "../../hooks/sampleUsers";

const successfulLoginHandler = (user: UserType | Document<any, any, any>, { res }: Context): string => {
	sendRefreshToken(res, createRefreshToken(user as UserType));

	return createAccessToken(user as UserType);
};

const userResolvers = {
	Query: {
		myAccount: async (_parent: any, _args: any, context: Context): Promise<UserType> => {
			const user: UserType = await User.findById(new ObjectID(context.payload!.id));

			if (!user) {
				throw new Error("user not found");
			}

			return user;
		},
		findUserByTag: async (_parent: any, { tag }: { tag: string }, _context: Context): Promise<UserType> => {
			const user: UserType = await User.findOne({ "account.tag": tag });

			if (!user) {
				throw new Error("user not found");
			}

			return user;
		},
		findUsersById: async (_parent: any, { ids }: { ids: string[] }, _context: Context): Promise<UserType[]> => {
			let users: UserType[] = [];

			//for each id in the array [2]
			for (let i = 0; i < ids.length; i++) {
				const id = ids[i];
				const user: UserType = await User.findById(new ObjectID(id));

				if (user !== null) {
					//[3] if that user exists, append to the end of return user array [4]
					users.push(user);
				}
			}

			if (users.length === 0) {
				//[4] if nothing is added, id list was a flop
				throw new Error("No users found w/ given id list");
			}

			return users;
		},
		randomUser: async (_parent: any, _args: any, _context: Context): Promise<UserType> => {
			const user = await getRandomUser(false);

			if (!user) {
				throw new Error("error finding random user");
			}

			return user as UserType;
		},
		randomUsers: async (_parent: any, { count }: { count: number }, _context: Context): Promise<UserType[]> => {
			const users = await getRandomUsers(count);

			if (!users) {
				throw new Error("Error sampling users");
			}

			return users;
		},
		allUsers: async (_parent: any, _args: any, _context: Context): Promise<UserType[]> => {
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
				return results;
			} catch (error) {
				throw new Error(error);
			}
		},
	},
	Mutation: {
		follow: async (_parent: any, { id }: { id: string }, context: Context) => {
			const myID = context.payload!.id;

			try {
				//add them to our following list
				await User.findByIdAndUpdate(new ObjectID(myID), { $addToSet: { "profile.followingIds": id } }, { useFindAndModify: false });

				//add our id to their follower list
				await User.findByIdAndUpdate(new ObjectID(id), { $addToSet: { "profile.followerIds": myID } }, { useFindAndModify: false });

				return {
					success: true,
				};
			} catch (error) {
				throw new Error(error);
			}
		},
		unfollow: async (_parent: any, { id }: { id: string }, context: Context) => {
			const myID = context.payload!.id;

			try {
				//remove them from our following list
				await User.findByIdAndUpdate(new ObjectID(myID), { $pull: { "profile.followingIds": id } }, { useFindAndModify: false });

				//remove our id from their follower list
				await User.findByIdAndUpdate(new ObjectID(id), { $pull: { "profile.followerIds": myID } }, { useFindAndModify: false });

				return {
					success: true,
				};
			} catch (error) {
				throw new Error(error);
			}
		},
		updateProfile: async (_parent: any, { name, tag, description }: EditProfInput, context: Context) => {
			//get the user so we can set the defaults to what they currently are (no change)
			let user: UserType = await User.findById(new ObjectID(context.payload!.id));

			//check n case this account has been deleted somehow... on another device maybe?
			if (!user) {
				throw new Error("account not found");
			}

			//if no input is given, default to the current, otherwise use the input
			const newName = name === null ? user.account.username : name;
			const newTag = tag === null ? user.account.tag : tag;
			const newDes = description === null ? user.profile.description : description;
			// todo
			const newBanner = user.profile.bannerUrl;
			const newPfp = user.profile.pictureUrl;

			try {
				await User.findByIdAndUpdate(
					new ObjectID(context.payload!.id),
					{
						$set: {
							"account.username": newName,
							"account.tag": newTag,
							"profile.description": newDes,
							"profile.bannerUrl": newBanner,
							"profile.pictureUrl": newPfp,
						},
					},
					{ useFindAndModify: false }
				);

				//manually update our local version, so we can return the new
				//user without sending another req to the database
				user.account.username = newName;
				user.account.tag = newTag;
				user.profile.description = newDes;
				user.profile.bannerUrl = newBanner;
				user.profile.pictureUrl = newPfp;

				return user;
			} catch (error) {
				throw new Error(error);
			}
		},
		login: async (_: any, { input, password }: { input: string; password: string }, context: Context) => {
			//check if email or username [tag]
			const regEx = /^([0-9a-zA-Z]([-.\w]*[0-9a-zA-Z])*@([0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.)+[a-zA-Z]{2,9})$/;
			const isEmail = input.match(regEx);

			//validate input
			if (isEmail) {
				let { valid, errors } = ValidateRegisterInput(input, "email");
				if (!valid) {
					throw new UserInputError("Errors", { errors });
				}
			} else {
				let { valid, errors } = ValidateRegisterInput(input, "username");
				if (!valid) {
					throw new UserInputError("Errors", { errors });
				}
			}

			//validate password
			let { valid, errors } = ValidateRegisterInput(password, "password");
			if (!valid) {
				throw new UserInputError("Errors", { errors });
			}

			//check if user exists
			let user: UserType;
			if (isEmail) {
				user = await User.findOne({ "account.email": input });
			} else {
				user = await User.findOne({ "account.tag": input });
			}

			if (!user) {
				if (isEmail) {
					throw new UserInputError("User not found", {
						errors: {
							email: "no user is registered with this email",
						},
					});
				} else {
					throw new UserInputError("User not found", {
						errors: {
							username: "no user is registered with this username",
						},
					});
				}
			}

			const match = await argon2.verify(user.account.password, password);
			if (!match) {
				throw new UserInputError("Wrong credentials", {
					errors: {
						password: "incorrect password",
					},
				});
			}

			// note  successful login

			//update status
			await User.findByIdAndUpdate(user._id, { $set: { status: "online" } }, { useFindAndModify: false });

			return {
				accessToken: successfulLoginHandler(user, context),
				user,
			};
		},
		register: async (_: any, { email, password }: { email: string; password: string }, context: Context) => {
			email = String(email).trim();

			//#region Validate Input
			//validate email before using it to make the username
			let { valid, errors } = ValidateRegisterInput(email, "email");
			if (!valid) {
				throw new UserInputError("Errors", { errors });
			}

			let emailSplit = String(email).split("@");
			let username = String(emailSplit[0].trim()).replaceAll("@", "");

			//validate username
			({ valid, errors } = ValidateRegisterInput(username, "username"));
			if (!valid) {
				throw new UserInputError("Errors", { errors });
			}

			let tag = username;

			//validate password
			({ valid, errors } = ValidateRegisterInput(password, "password"));
			if (!valid) {
				throw new UserInputError("Errors", { errors });
			}
			//#endregion

			let max = 9;
			const CheckAndGenerateUsername = async (length: number, testTag: string, repeat: boolean, cycleNum: number): Promise<void> => {
				const matchUser = await User.findOne({
					"account.tag": testTag,
				});

				if (matchUser) {
					//the username is already taken
					if (repeat) {
						//reset test-tag before adding numbers if the numbered name was taken
						testTag = tag;
					}
					testTag += Math.floor(Math.random() * length) + 1;

					if (max < 999 || cycleNum > 10) {
						//add 9 to end of number for next pass
						max = parseInt(`${max}${9}`);
					}

					return await CheckAndGenerateUsername(max, testTag, true, cycleNum++);
				}

				tag = testTag;
				return;
			};

			//check if a user with the tag already exists & add a random # to tag
			await CheckAndGenerateUsername(max, tag, false, 0);

			//check if user exists
			const muser: UserType = await User.findOne({ "account.email": email });
			if (muser) {
				throw new UserInputError("email taken", {
					errors: {
						email: "An account is already registered with email",
					},
				});
			}

			//hashing passwords before they are saved on the database
			password = await argon2.hash(password, {
				type: argon2.argon2id,
				hashLength: 41,
			});

			await User.init();

			const newUser = new User({
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
					bannerUrl: `/banners/image_${Math.floor(Math.random() * 4)}.webp`, //0-3
					pictureUrl: `/user_content/p_pictures/cup${Math.floor(Math.random() * 18)}.jpg`, //0-17
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
			} catch (error) {
				throw new Error("Unable to save user to database");
			}

			const user: UserType = newUser as any;

			return {
				accessToken: successfulLoginHandler(newUser, context),
				user,
			};
		},
		logout: async (_parent: any, _args: any, { res, payload }: Context) => {
			if (!payload) {
				//payload is false
				console.log(JSON.stringify(payload));

				return false;
			}
			try {
				await User.findByIdAndUpdate(payload.id, { $set: { status: "offline" } }, { useFindAndModify: false });
				//clear to cookie by resending it, but as empty
				sendRefreshToken(res, "");
				return true;
			} catch (error) {
				throw new Error(error);
			}
		},
	},
};

export default userResolvers;
