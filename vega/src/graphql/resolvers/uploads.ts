import fs from "fs";
import path from "path";

import Context from "../../context";
import { convertToWebpBanner, convertToWebpPfp } from "../../util/imageOpts";
import { validateFileExtensions } from "../../util/validators";
import { UserInputError } from "apollo-server-express";
import User from "../../models/User";

const contentDir = "public/uploads/";
let uploadedPfps: string[];
let uploadedBanners: string[];

//on server start, fetch the names of the uploaded files
fs.readdir(contentDir + "pfps/", (err, files) => {
	if (err) {
		//log any error that occurs
		console.log(`Error fetching all pfp file names from dir: ${contentDir} \n The error was: \n ${err}`);
	} else {
		uploadedPfps ??= files;

		console.log("🦄 Profile picture filenames fetched and saved");
	}
});

fs.readdir(contentDir + "banners/", (err, files) => {
	if (err) {
		//log any error that occurs
		console.log(`Error fetching all banner file names from dir: ${contentDir} \n The error was: \n ${err}`);
	} else {
		uploadedBanners ??= files;
		console.log("🍧 Banner filenames fetched and saved");
	}
});

const uploadsResolvers = {
	Mutation: {
		singleUpload: async (_parent: any, { file, type }: { file: any; type: string }, { payload }: Context) => {
			//variables which control the different behaviors of the types of uploads
			//let existingUploads: string[];
			let savePath: string;
			let imageOptimization: any;

			switch (type) {
				case "pfp":
					//existingUploads = uploadedPfps;
					imageOptimization = convertToWebpPfp;
					savePath = contentDir + "pfps";
					break;
				case "banner":
					//existingUploads = uploadedBanners;
					imageOptimization = convertToWebpBanner;
					savePath = contentDir + "banners";
					break;
				default:
					throw new Error("No valid type --banner, pfp, etc-- passed in as a prop with this upload");
			}

			const { createReadStream, filename, mimetype, encoding } = await file;

			//split the name at the . and take the file extention
			const name = filename as string;
			const extension = name.split(".")[1];

			//check if we recieved a supported image format, this is a secondary check
			//since the frontend only allows these in the file exporter, but if a direct req is sent?
			const { errors, valid } = validateFileExtensions(extension, ["png", "jpg", "jpeg", "webp", "jfif", "avif"]);
			if (!valid) {
				throw new UserInputError(errors.file);
			}

			//use the user id as the name
			const saveName = `${payload?.id}.webp`;

			//change the user's profile data if pfp or banner
			try {
				if (type === "pfp") {
					//update the user's pfp url to the current relative: i.e. /banners/blahblah.webp (frontend handles baseUrl)
					await User.findByIdAndUpdate(payload!.id, { $set: { "profile.pictureUrl": `/pfps/${saveName}` } }, { useFindAndModify: false });
				} else if (type === "banner") {
					//update the user's banner url to the new
					await User.findByIdAndUpdate(payload!.id, { $set: { "profile.bannerUrl": `/banners/${saveName}` } }, { useFindAndModify: false });
				}
			} catch (err) {
				throw new Error("Error finding and updating user's pfp or banner image on new upload");
			}

			//upload the file
			await new Promise((res) =>
				createReadStream()
					.pipe(imageOptimization)
					.pipe(fs.createWriteStream(path.join(savePath, saveName)))
					.on("close", res)
			);

			//store the filename in the array of uploads
			switch (type) {
				case "pfp":
					if (!uploadedPfps.includes(saveName)) {
						//we only need to replace the old file name, but since
						//filenames are = for a single user, we just do nothing
						//but, add the name if this is the first upload and one
						//does not exist already.
						uploadedPfps.push(saveName);
					}
					break;
				case "banner":
					if (!uploadedBanners.includes(saveName)) {
						uploadedBanners.push(saveName);
					}
					break;
				default:
					throw new Error("Error when saving new file name to variable array storage of uploaded files");
			}

			return {
				filename: saveName,
				mimetype: mimetype,
				encoding: encoding,
			};
		},
	},
};

export default uploadsResolvers;
