export const getActivity = async () => {
  const response = await fetch("https://api.whatmedoin.frixaco.com/activity");
  const data: { platform: string; title: string; url: string; date: string } =
    await response.json();

  const utcDateString = data.date;
  const utcDate = new Date(utcDateString);
  const localDate = new Date();
  const diffInMs = Math.abs(utcDate.getTime() - localDate.getTime());
  const diffInMinutes = diffInMs / 60000;

  if (diffInMinutes > 30) {
    return "either AFK, on my phone or doing something else";
  }

  if (data.platform === "browser") {
    if (
      ["guidetojapanese.org", "animelon.com"].some((domain) =>
        data.url.includes(domain)
      )
    ) {
      return "learning Japanese";
    }

    if (["youtube.com"].some((domain) => data.url.includes(domain))) {
      if (data.url.includes("list=PLcjQUNxFpwsRJ6a2vO5EeHMkSd4ck7IbS")) {
        return "listening to music";
      } else {
        return "watching YouTube";
      }
    }
  }

  if (data.platform === "android") {
    return "on my phone";
  }

  if (["WezTerm", "wezterm-gui", "kitty"].includes(data.title)) {
    return "in WezTerm (best terminal)";
  }

  if (["Cursor", "pwsh", "Code"].includes(data.title)) {
    return "working or making another pet project";
  }

  if (["Slack"].includes(data.title)) {
    return "talking with colleagues";
  }

  if (["Anki", "anki"].includes(data.title)) {
    return "learning some Japanese vocabulary";
  }

  if (["Heptabase", "Obsidian"].includes(data.title)) {
    return "doing some note taking";
  }

  if (["osu!"].includes(data.title)) {
    return "playing my favorite game - osu!";
  }

  if (["Blender"].includes(data.title)) {
    return "doing some 3D work in Blender";
  }

  if (["krita"].includes(data.title)) {
    return "doing some 2d art using Krita";
  }

  return "oops, tracker not working, click to report";
};
