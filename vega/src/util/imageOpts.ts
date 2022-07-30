import sharp from "sharp";

//good default quality is 75
export const convertToWebpPfp = sharp()
	.resize({
		width: 400,
		height: 400,
		fit: "cover",
	})
	.webp({ quality: 75 });

//495 by 343.5 but 2x is 990 x 687
export const convertToWebpBanner = sharp()
	.resize({
		width: 990,
		height: 687,
		fit: "cover",
	})
	.webp({ quality: 75 });

export const serveSizeBanner = (file: string, w: number, h: number) =>
	sharp(file).resize({
		width: w,
		height: h,
		fit: "cover",
	});

//for posts, which are 968px by 545px (save to 2x)
//limit to 2x 1080p display value, so 1936 by 1090
export const convertToWebpClamped = sharp()
	.metadata()
	.then(function (metadata) {
		if (metadata === undefined) {
			return sharp()
				.resize({
					width: 1936,
					height: 1090,
					fit: "cover",
				})
				.webp({ quality: 75 });
		} else {
			let newWidth = metadata.width;
			let newHeight = metadata.height;
			//@ts-ignore
			if (metadata.width > 1936) {
				newWidth = 1936;
			}
			//@ts-ignore
			if (metadata.height > 1090) {
				newHeight = 1090;
			}

			return sharp()
				.resize({
					width: newWidth,
					height: newHeight,
					fit: "cover",
				})
				.webp({ quality: 75 });
		}
	});
