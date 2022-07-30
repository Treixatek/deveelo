import { composeResolvers } from "@graphql-tools/resolvers-composition";

import resolvers from "../resolvers";
import { MyResolversComposition } from "src/util/middlewareType";
import { loggedInOnlyAuth } from "./isAuth";

//where auth middleware is compiled

//middleware that does nothing, put into compostion for resolvers w/o middleware
const metrics = (): MyResolversComposition => (next) => async (parent, args, context, info) => {
	//eventually, this will become a universal metrics middleware for gauging total site activity
	const result = await next(parent, args, context, info);
	return result;
};

//based on that list, assign a number of specified middlewares to each resolver
const resolversComposition = {
	//Post Queries
	"Query.getPosts": metrics(),
	//User Queries
	"Query.myAccount": [metrics(), loggedInOnlyAuth()],
	"Query.findUserByTag": metrics(),
	"Query.findUsersById": metrics(),
	"Query.randomUser": metrics(),
	"Query.randomUsers": metrics(),
	"Query.allUsers": metrics(),
	//User Mutations
	"Mutation.register": metrics(),
	"Mutation.login": metrics(),
	"Mutation.logout": [metrics(), loggedInOnlyAuth()],
	"Mutation.follow": [metrics(), loggedInOnlyAuth()],
	"Mutation.unfollow": [metrics(), loggedInOnlyAuth()],
	"Mutation.updateProfile": [metrics(), loggedInOnlyAuth()],
	//Upload Mutations
	"Mutation.singleUpload": [metrics(), loggedInOnlyAuth()],
};

//compose the resolver map, send to index.ts, use in schema
export const composedResolvers = composeResolvers(resolvers, resolversComposition);
