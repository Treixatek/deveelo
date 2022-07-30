import "dotenv/config";
import mongoose from "mongoose";

import User from "../models/User";

export const updateField = async (): Promise<void> => {
	try {
		await User.updateMany({}, { $set: { "profile.bannerUrl": `/banners/image_${Math.floor(Math.random() * 4)}.webp` } });
		console.log(`📁 - Successfully changed field for all users`);
		return;
	} catch (error) {
		console.log(error);
		console.log(`⛔ - Error updating field`);
	}
};

mongoose
	.connect(process.env.MONGODB_KEY!, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(async () => {
		await updateField();
	});
