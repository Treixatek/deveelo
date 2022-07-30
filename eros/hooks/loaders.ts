//image optimization, changes the request url based on inputs
//aka - server images at smaller sizes based on usage

import { ImageLoader, ImageLoaderProps } from "next/image";
import { getServerUrl, getWebUrl } from "../lib/links";

export const bannerLoader: ImageLoader = ({ src, width, quality }: ImageLoaderProps) => {
	//if using the default cups, this file will be on the frontend
	const isDefault = src.startsWith("/user_content");

	if (isDefault) {
		return `${getWebUrl()}/${src}?w=${width}&q=${quality || 75}`;
	} else {
		return `${getServerUrl("uploads")}${src}`;
	}
};
