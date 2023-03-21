/**
 * Note: This file was generated using https://app.quicktype.io and the data from the spotify API documentation that
 * can be found here: https://developer.spotify.com/documentation/web-api/reference/#/operations/get-current-users-profile
 * in the response example section.
 */

export interface SpotifyCurrentUserProfileResponse {
    country: string;
    display_name: string;
    email: string;
    explicit_content: ExplicitContent;
    external_urls: ExternalUrls;
    followers: Followers;
    href: string;
    id: string;
    images: Image[];
    product: string;
    type: string;
    uri: string;
}

export interface ExplicitContent {
    filter_enabled: boolean;
    filter_locked: boolean;
}

export interface ExternalUrls {
    spotify: string;
}

export interface Followers {
    href: string;
    total: number;
}

export interface Image {
    url: string;
    height: number;
    width: number;
}
