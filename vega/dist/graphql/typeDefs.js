"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeDefs = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.typeDefs = graphql_tag_1.default `
	# The implementation for this scalar is provided by the
	# 'GraphQLUpload' export from the 'graphql-upload' package
	# in the resolver map in resolvers/index.ts
	scalar Upload

	#  note  Types
	#file uploads
	type File {
		filename: String!
		mimetype: String!
		encoding: String!
	}
	#posting
	type Post {
		_id: ID!
		body: String!
		createdAt: String!
		username: String!
	}

	#general
	type LoginResponse {
		accessToken: String!
		user: User!
	}
	#user types
	type U_Account {
		username: String!
		tag: String!
		short: String!
		password: String!
		email: String!
		createdAt: String!
		lastOnline: String!
		private: Boolean!
		blockedIds: [String]!
		tokenVersion: Int!
		pro: Boolean!
	}
	type U_Profile {
		bannerUrl: String!
		pictureUrl: String!
		description: String!
		followingIds: [String]!
		followerIds: [String]!
		friendIds: [String]!
		friendRqIds: [String]!
		badges: [String]!
		linkedProfiles: [String]!
	}
	type U_Social {
		postIds: [String]!
		blogIds: [String]!
		groupIds: [String]!
		betaIds: U_BetaIds!
		chatIds: [String]!
	}
	type U_BetaIds {
		hostedIds: [String]!
		joinedIds: [String]!
	}

	# stripped for profile edit
	type PUser {
		_id: ID!
		account: PAccount!
		profile: PProfile!
	}

	type PAccount {
		username: String!
		tag: String!
	}

	type PProfile {
		bannerUrl: String!
		pictureUrl: String!
		description: String!
	}

	# all types
	type User {
		_id: ID!
		account: U_Account!
		profile: U_Profile!
		status: String!
		social: U_Social!
	}

	type BoolRes {
		success: Boolean!
	}

	# note  Queries (searches)
	type Query {
		getPosts: [Post]!
		myAccount: User
		findUserByTag(tag: String!): User!
		findUsersById(ids: [String!]!): [User]!
		randomUser: User!
		randomUsers(count: Int!): [User]!
		allUsers: [User]!
	}

	# note  Mutations (read/write/updates)
	type Mutation {
		register(email: String!, password: String!): LoginResponse!
		login(input: String!, password: String!): LoginResponse!
		logout: Boolean!
		follow(id: String!): BoolRes
		unfollow(id: String!): BoolRes
		updateProfile(name: String, tag: String, description: String): User!
		singleUpload(file: Upload!, type: String!): File!
	}
`;
//# sourceMappingURL=typeDefs.js.map