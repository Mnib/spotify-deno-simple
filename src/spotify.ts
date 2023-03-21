import { serve } from "https://deno.land/std@0.180.0/http/server.ts";
import { SpotifyCurrentUserProfileResponse } from "./interfaces/spotify-current-user-profile.ts";
import { SpotifyCurrentPlayingResponse } from "./interfaces/spotify-currently-playing.ts";

type TokenResponse = {
    access_token: string;
    expires_in: number;
    refresh_token: string;
};

type RefreshTokenResponse = {
    access_token: string;
    expires_in: number;
};

export class SpotifyService {
    private static REDIRECT_URI = "http://localhost:30071";
    // You can checkout the list of available scopes on
    // https://developer.spotify.com/documentation/general/guides/authorization/scopes/
    private static SCOPES = "user-read-private user-read-email user-read-currently-playing";

    private client_id = Deno.env.get("CLIENT_ID") || "";
    private client_secret = Deno.env.get("CLIENT_SECRET") || "";
    private loggedIn = false;
    private token = "";
    private refresh_token = "";
    private token_expiration = new Date(0);

    private getRandomString() {
        return (Math.random() + 1).toString(36).substring(2);
    }

    private buildSpotifyUrl(): string {
        let url = `https://accounts.spotify.com/authorize?`;

        url += `response_type=code`;
        url += `&client_id=${this.client_id}`;
        url += `&scope=${SpotifyService.SCOPES}`;
        url += `&redirect_uri=${SpotifyService.REDIRECT_URI}`;
        url += `&state=${this.getRandomString()}`;

        return encodeURI(url);
    }

    private tokenExpired() {
        return this.token_expiration.getTime() <= Date.now();
    }

    private async spotifyGetRequest<T>(uri: string): Promise<T> {
        if (!this.loggedIn) {
            console.error("Not logged in");
            Deno.exit(1);
        }

        if (this.tokenExpired()) {
            await this.refreshToken();
        }

        return await fetch(`https://api.spotify.com/v1${uri}`, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.token}`,
            },
        }).then((res) => {
            if (res.status !== 200) {
                console.error(`Spotify API call for ${uri} returned status ${res.status}: ${res.statusText}`);
                return Promise.reject();
            }

            return res.json();
        });
    }

    private async refreshToken() {
        if (!this.loggedIn) return;

        let body = `grant_type=refresh_token`;
        body += `&refresh_token=${this.refresh_token}`;

        return await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${btoa(`${this.client_id}:${this.client_secret}`)}`,
                "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
            },
            body,
        }).then((res) => {
            if (res.status !== 200) {
                return Promise.reject(`Authorization error: code ${res.status}`);
            }

            return res.json();
        }).then((res: RefreshTokenResponse) => {
            this.token = res.access_token;
            this.token_expiration = new Date(Date.now() + res.expires_in * 1000);

            console.log("Spotify token refreshed");
        });
    }

    private async getToken(code: string) {
        let body = `grant_type=authorization_code`;
        body += `&code=${code}`;
        body += `&redirect_uri=${SpotifyService.REDIRECT_URI}`;

        return await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${btoa(`${this.client_id}:${this.client_secret}`)}`,
                "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
            },
            body,
        }).then((res) => {
            if (res.status !== 200) {
                return Promise.reject(`Authorization error: code ${res.status}`);
            }

            return res.json();
        }).then((res: TokenResponse) => {
            this.token = res.access_token;
            this.refresh_token = res.refresh_token;
            this.token_expiration = new Date(Date.now() + res.expires_in * 1000);
            this.loggedIn = true;

            console.log("Logged in to Spotify");

            // Write the refresh token to a file so that we can use this file to login without using the link
            const encoder = new TextEncoder();
            const refresh_token_data = encoder.encode(this.refresh_token);
            Deno.writeFile("refresh_token", refresh_token_data);
        });
    }

    private waitForCode() {
        return new Promise<string>((resolve, reject) => {
            const ac = new AbortController();

            const timeout_handler = setTimeout(() => {
                ac.abort();
                return reject("Operation timed out");
            }, 120000);

            let auth_code: string = null!;

            const handler = (req: Request) => {
                clearTimeout(timeout_handler);

                const url = new URL(req.url);
                const code = url.searchParams.get("code");
                if (code === null) {
                    reject("Authorization error");
                    return new Response();
                }

                auth_code = code;
                ac.abort();
                return new Response();
            };

            serve(handler, {
                port: 30071,
                signal: ac.signal,
                onListen: () => console.log("Waiting for authorization (120s)"),
            }).then(() => resolve(auth_code));
        });
    }

    /**
     * Login to spotify using the credentials provided in the environment variables.
     * This should be the first function used in your program.
     */
    public async login() {
        if (this.client_id.length === 0 || this.client_secret.length === 0) {
            console.error("Missing client id or client secret");
            Deno.exit(1);
        }

        console.log("Successfully logged in to Spotify");
        console.log("Client ID:", this.client_id);

        try {
            const data = Deno.readFileSync("refresh_token");
            console.log(
                "Found refresh token file, trying to login using that.",
                "If you don't want to auto-login, delete the `refresh_token` file",
            );

            const decoder = new TextDecoder();
            this.refresh_token = decoder.decode(data);

            try {
                this.loggedIn = true;
                await this.refreshToken();
                return;
            } catch (_) {
                this.loggedIn = false;
            }
        } catch (_) {
            // no-op
        }

        const url = this.buildSpotifyUrl();
        console.log("Open this url in your browser:", url);

        const code = await this.waitForCode().catch((e) => {
            console.error(e);
            Deno.exit(1);
        });

        await this.getToken(code).catch((e) => {
            console.error(e);
            Deno.exit(1);
        });
    }

    /**
     * Returns the currently playing track.
     * Check out https://developer.spotify.com/documentation/web-api/reference/#/operations/get-the-users-currently-playing-track
     * for reference.
     */
    public async getCurrentlyPlayingTrack() {
        return await this.spotifyGetRequest<SpotifyCurrentPlayingResponse>("/me/player/currently-playing").catch(() => {
            console.error("Failed to get currently playing track. Exiting.");
            Deno.exit(1);
        });
    }

    public async getCurrentUserProfile() {
        return await this.spotifyGetRequest<SpotifyCurrentUserProfileResponse>("/me");
    }
}
