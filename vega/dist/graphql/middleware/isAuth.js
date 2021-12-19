"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuth = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const loggedInOnlyAuth = async (resolve, _parent, _args, context, _info) => {
    const authorization = context.req.headers["authorization"];
    console.log(`looking for header "authorization" in context headers:\n${JSON.stringify(context.req.headers)}`);
    if (!authorization) {
        throw new Error("not authenticated");
    }
    try {
        const token = authorization.split(" ")[1];
        console.log(`-\nTOKEN:\n"${token}"`);
        console.log(process.env.ACCESS_TOKEN_SECRET);
        const payload = jsonwebtoken_1.verify(token, process.env.ACCESS_TOKEN_SECRET);
        context.payload = payload;
    }
    catch (err) {
        console.log("failed");
        throw new Error("not authenticated [fail]");
    }
    const result = await resolve(_parent, _args, context, _info);
    return result;
};
exports.isAuth = {
    Query: {
        myAccount: loggedInOnlyAuth,
    },
};
//# sourceMappingURL=isAuth.js.map