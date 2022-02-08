import Meta from "../components/micro/Meta";

let notifEmojis = new Map<string, string>([
	["gift", "🎁"],
	["update", "🎀"],
	["message", "🔥"],
	["friend", "💝"],
	["views", "🔴"],
]);

export default function Home() {
	const notifs: string[] = [];

	const title = notifs.length > 0 ? `Deveelo | ${notifEmojis.get(notifs[0]) + notifs.length}` : "Deveelo";

	return (
		<div>
			<Meta
				title={title}
				description="Live betas, groups with likeminded game devleopers and their latest updates in realtime - it can all be found here on Deveelo, the social platform for game developers and artists"></Meta>
		</div>
	);
}
