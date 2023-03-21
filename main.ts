import "https://deno.land/x/dotenv@v3.2.2/load.ts";
import { SpotifyService } from "./src/spotify.ts";

async function main() {
    const spotify = new SpotifyService();
    await spotify.login();

    const profile = await spotify.getCurrentUserProfile();
    console.log(`Hello ${profile.display_name},`);

    const currentlyPlaying = await spotify.getCurrentlyPlayingTrack();
    console.log(
        `You are currently playing ${currentlyPlaying.item.name} by ${
            currentlyPlaying.item.artists.map(({ name }) => name).join(", ")
        }`,
    );
}

main();
