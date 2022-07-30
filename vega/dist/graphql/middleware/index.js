"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.composedResolvers = void 0;
const resolvers_composition_1 = require("@graphql-tools/resolvers-composition");
const resolvers_1 = __importDefault(require("../resolvers"));
const isAuth_1 = require("./isAuth");
const metrics = () => (next) => async (parent, args, context, info) => {
    const result = await next(parent, args, context, info);
    return result;
};
const resolversComposition = {
    "Query.getPosts": metrics(),
    "Query.myAccount": [metrics(), isAuth_1.loggedInOnlyAuth()],
    "Query.findUserByTag": metrics(),
    "Query.findUsersById": metrics(),
    "Query.randomUser": metrics(),
    "Query.randomUsers": metrics(),
    "Query.allUsers": metrics(),
    "Mutation.register": metrics(),
    "Mutation.login": metrics(),
    "Mutation.logout": [metrics(), isAuth_1.loggedInOnlyAuth()],
    "Mutation.follow": [metrics(), isAuth_1.loggedInOnlyAuth()],
    "Mutation.unfollow": [metrics(), isAuth_1.loggedInOnlyAuth()],
    "Mutation.updateProfile": [metrics(), isAuth_1.loggedInOnlyAuth()],
    "Mutation.singleUpload": [metrics(), isAuth_1.loggedInOnlyAuth()],
};
exports.composedResolvers = resolvers_composition_1.composeResolvers(resolvers_1.default, resolversComposition);
//# sourceMappingURL=index.js.map