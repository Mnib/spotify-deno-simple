# Spotify example

## Introduction

This is a spotify example that gets the current playing track for a user and displays it.

## Environment and Spotify developer account

- Setup your application from your spotify developers portal and get your Client ID and Secret.
- Create a `.env` file in the root folder with the following:

```
CLIENT_ID=<YOUR_CLIENT_ID>
CLIENT_SECRET=<YOUR_CLIENT_SECRET>
```

- Make sure that your Spotify's project settings has the `http://localhost:30071` URI in `Redirect URIs`. To do so, go
  to the application's settings on your Spotify Developer portal.

## Quick start

Install deno: https://deno.land

Run with

```
deno run --allow-env --allow-read --allow-write --allow-net main.ts
```
