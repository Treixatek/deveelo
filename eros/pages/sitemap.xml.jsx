const EXTERNAL_DATA_URL = "https://vega-deployment.herokuapp.com/users";

function generateSiteMap(users) {
	return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>https://www.deveelo.com</loc>
     </url>
     ${users
			.map(({ account }) => {
				return `
       <url>
           <loc>${`https://www.deveelo.com/${account.tag}`}</loc>
       </url>
     `;
			})
			.join("")}
   </urlset>
 `;
}

function SiteMap() {
	// getServerSideProps will do the heavy lifting
}

export async function getServerSideProps({ req, res }) {
	// We make an API call to gather the URLs for our site
	const request = await fetch(EXTERNAL_DATA_URL, { credentials: "include", mode: "cors" });
	const users = await request.json();

	// We generate the XML sitemap with the posts data
	const sitemap = generateSiteMap(users);

	res.setHeader("Content-Type", "text/xml");
	// we send the XML to the browser
	res.write(sitemap);
	res.end();

	return {
		props: {},
	};
}

export default SiteMap;
