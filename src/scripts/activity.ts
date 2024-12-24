const getActivityMessage = async () => {
	const response = await fetch("https://api.whatmedoin.frixaco.com/activity")
	const data: { platform: string; title: string; url: string; date: string } = await response.json()

	const utcDateString = data.date
	const utcDate = new Date(utcDateString)
	const localDate = new Date()
	const diffInMs = Math.abs(utcDate.getTime() - localDate.getTime())
	const diffInMinutes = diffInMs / 60000

	if (diffInMinutes > 30) {
		return "I'm either AFK, on my phone or doing something else"
	}

	if (data.platform === "browser") {
		if (["guidetojapanese.org", "animelon.com"].some((domain) => data.url.includes(domain))) {
			return "I'm learning Japanese right now..."
		}

		if (["youtube.com"].some((domain) => data.url.includes(domain))) {
			if (data.url.includes("list=PLcjQUNxFpwsRJ6a2vO5EeHMkSd4ck7IbS")) {
				return "I'm listening to my Music playlist right now..."
			} else {
				return "I'm watching YouTube right now..."
			}
		}
	}

	if (data.platform === "android") {
		return "I'm on my phone right now..."
	}

	if (["WezTerm", "wezterm-gui"].includes(data.title)) {
		return "I'm coding right now, using WezTerm..."
	}

	if (["Cursor", "pwsh"].includes(data.title)) {
		return "I'm coding right now, either working or doing personal projects..."
	}

	if (["Slack"].includes(data.title)) {
		return "I'm at work right now (in Slack)..."
	}

	if (["Anki", "anki"].includes(data.title)) {
		return "I'm learning Japanese right now (learning new words)..."
	}

	if (["Heptabase"].includes(data.title)) {
		return "I'm in Heptabase right now. Either doing Japanese or writing/planning something personal..."
	}

	if (["osu!"].includes(data.title)) {
		return "I'm playing my favorite game, osu! right now..."
	}

	if (["Blender"].includes(data.title)) {
		return "I'm using Blender and doing some 3D modeling right now..."
	}

	return "Tracking not working properly, please let me know if you see this!"
}
export { getActivityMessage }
