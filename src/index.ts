import { ApolloServer } from "apollo-server";
import mongoose from "mongoose";
import "dotenv/config";

import { typeDefs } from "./graphql/typeDefs";
import resolvers from "./graphql/resolvers";

// development  change mongodb user password & access

const server = new ApolloServer({
	typeDefs,
	resolvers,
	context: ({ req, res }) => ({ req, res }),
});

//connect to the mongodb database
mongoose
	.connect(process.env.MONGODB_KEY!, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => {
		console.log("database connected");
		return server.listen({ port: 5000 });
	})
	.then((res) => {
		console.log(`Server running at ${res.url} 🎉`);
	});
