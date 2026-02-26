const el = document.getElementById("last-played");

(async () => {
  try {
    const data = await fetch("https://tools.borges.workers.dev/recent-tracks").then(r => r.json());

    const name = String(data.recenttracks.track[0].name);
    const artist = String(data.recenttracks.track[0].artist["#text"]);
    const url = String(data.recenttracks.track[0].url);

    el.innerText = name.toLowerCase() + " - " + artist.toLowerCase();
    el.href = url;
  } catch (error) {
    el.innerText = "[oops 😔... something went wrong]";
  }
})()