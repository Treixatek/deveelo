import Head from "next/head";

const Meta = ({ title, keywords, description, url, image, showBanner, color }) => {
	return (
		<Head>
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<meta name="keywords" content={keywords} />
			<meta name="description" content={description} />
			<meta charSet="utf-8" />

			{/* Favicons */}
			<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"></link>
			<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"></link>
			<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"></link>
			<link rel="manifest" href="/site.webmanifest"></link>
			<link rel="mask-icon" href="/safari-pinned-tab.svg" color="#f79f1b"></link>
			<meta name="msapplication-TileColor" content="#20296b"></meta>

			<title>{title}</title>
			<meta property="og:image" content={image}></meta>
			<meta property="og:title" content={title}></meta>
			<meta property="og:url" content={url}></meta>
			<meta property="og:description" content={description}></meta>
			<meta content={color} data-react-helmet="true" name="theme-color" />
			{showBanner ? <meta name="twitter:card" content="summary_large_image" /> : null}
		</Head>
	);
};

Meta.defaultProps = {
	title: "Deveelo",
	keywords: "game development, devlogs, beta testing, gamedev, beta, videogames, posting, communities, groups, art",
	description: "Explore posts, groups, devlogs, and more on Deveelo, the social platform for game developers and artists",
	url: "https://www.deveelo.com",
	image: "/embedlogo.png",
	showBanner: false,
	color: "#f5ce42",
};

export default Meta;
