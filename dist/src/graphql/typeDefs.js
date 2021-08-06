"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeDefs = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.typeDefs = graphql_tag_1.default `
	# note  Types
	type Post {
		id: ID!
		body: String!
		createdAt: String!
		username: String!
	}
	type LoginResponse {
		accessToken: String!
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

	#all types
	type User {
		id: ID!
		token: String!
		account: U_Account!
		profile: U_Profile!
		status: String!
		social: U_Social!
	}
	input RegisterInput {
		password: String!
		email: String!
	}

	# note  Queries (searches)
	type Query {
		getPosts: [Post],
		myAccount: {U_Account!, U_Profile!},
	}

	# note  Mutations (read/write/updates)
	type Mutation {
		register(registerInput: RegisterInput): User!
		login(input: String!, password: String!): LoginResponse!
	}
`;
//# sourceMappingURL=typeDefs.js.map