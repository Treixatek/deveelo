export const prodServerUrl = "https://vega-deployment.herokuapp.com/";

export const devServerUrl = "http://localhost:4000/";

//get the current vega url, and allow navigation to sub path
export const getServerUrl = (path?: string): string => {
	const route = path ? path : "";

	return process.env.NODE_ENV === "production" ? prodServerUrl + route : devServerUrl + route;
};
