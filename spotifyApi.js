const axios = require('axios');
const { EntityNotFoundError, ApiError, TooManyRequestsError } = require('./error');

const testId = "4aawyAB9vmqN3uQ7FjRGTy";

class SpotifyApi {
    constructor(accessToken) {
        // Initialize the instance with the access token
        this.accessToken = accessToken;
        this.baseUrl = 'https://api.spotify.com/v1';
    }

    static async getAccessToken(clientId, clientSecret) {
        const bearer = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const response = await axios.post(
            'https://accounts.spotify.com/api/token',
            'grant_type=client_credentials',
            {
            headers: {
                Authorization: `Basic ${bearer}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            }
        );
        return response.data.access_token;
    }

    axiosReq(reqUrl) {
        return new Promise((resolve, reject) => {
            axios.get(`${this.baseUrl}${reqUrl}`, {headers: {Authorization: `Bearer ${this.accessToken}`}})
            .then(response => {
                resolve(response.data);
            })
            .catch(error => {
                if(error.response && (error.response.status === 404)) {
                    reject(new EntityNotFoundError('Not Found Error'));
                }
                else if(error.response.status === 429) {
                    reject(new TooManyRequestsError('Too many Request'));
                }
                else {
                    reject(new ApiError('API Error'));
                }
            })
        })       
    }

    prom(items, func) {
        return (items ?? []).map(item => {
            return new Promise((resolve) => {
                func(item.id, (err, res) => {
                    if(err) {
                        console.error(`[prom] Error fetching item ${item.id}:`, err);
                        resolve(null);
                    }
                    else {
                        resolve(res);
                    }
                });
            });
        });
    }

    // async: callback(err, Album)
    getAlbum(albumId, callback) {
        // Implement getAlbum using axios
        this.axiosReq(`/albums/${albumId}`)
        .then(data => {
            const albumInfo = {
                albumId,
                artists: data.artists,
                genres: data.genres,
                name: data.name,
                imageUrl: data.images[0].url,
                releaseDate: data.release_date,
                tracks: data.tracks
            }
            callback(null, albumInfo);
        })
        .catch(error => {
            callback(error,null);
        })
    }

    // async: callback(err, [Album])
    async searchAlbums(query, callback) {
        // Implement searchAlbums using axios
        this.axiosReq(`/search?q=${encodeURIComponent(query)}&type=album&limit=10&offset=0`)
        .then(data => {
            let albumslist = [];

            this.getAlbum(testId, (errTest, _) => {
                if(errTest) return callback(errTest,null);

                const albumPromises = this.prom(data.albums.items, this.getAlbum.bind(this));

                Promise.all(albumPromises)
                .then(albumInfos => {
                    albumslist.push(...albumInfos.filter(album => album !== null));
                    callback(null, albumslist);
                })
            })
        })
        .catch(error => {
            callback(error,null);
        })
    }

    // async: callback(err, Track)
    getTrack(trackId, callback) {
        // Implement getTrack using axios
        this.axiosReq(`/tracks/${trackId}`)
        .then(data => {
            const trackInfo = {
                albumId: data.album.id,
                albumName: data.album.name,
                artists: data.artists,
                durationMs: data.duration_ms,
                trackId,
                name: data.name,
                popularity: data.popularity,
                previewUrl: data.preview_url
            }
            callback(null, trackInfo);
        })
        .catch(error => {
            callback(error,null);
        })
    }

    // async: callback(err, [Track])
    searchTracks(query, callback) {
        // Implement searchTracks using axios
        this.axiosReq(`/search?q=${encodeURIComponent(query)}&type=track&limit=10&offset=0`)
        .then(data => {
            let trackslist = [];

            this.getAlbum(testId, (errTest, _) => {
                if(errTest) return callback(errTest,null);

                const trackPromises = this.prom(data.tracks.items, this.getTrack.bind(this));

                Promise.all(trackPromises)
                .then(trackInfos => {
                    trackslist.push(...trackInfos.filter(track => track !== null));
                    callback(null, trackslist);
                })
            })
        })
        .catch(error => {
            callback(error,null);
        })
    }

    // async: callback(err, Artist)
    getArtist(artistId, callback) {
        // Implement getArtist using axios
        this.axiosReq(`/artists/${artistId}`)
        .then(data => {
            const artistInfo = {
                artistId,
                followers: data.followers.total,
                genres: data.genres,
                imageUrl: data.images ? data.images[0].url : null,
                name: data.name,
                popularity: data.popularity
            }
            callback(null, artistInfo);
        })
        .catch(error => {
            callback(error,null);
        })
    }

    searchArtists(query, callback) {
        // Implement searchTracks using axios
        this.axiosReq(`/search?q=${encodeURIComponent(query)}&type=artist&limit=10&offset=0`)
        .then(data => {
            let artistslist = [];

            this.getAlbum(testId, (errTest, _) => {
                if(errTest) return callback(errTest,null);
            
                const artistPromises = this.prom(data.artists.items, this.getArtist.bind(this));

                Promise.all(artistPromises)
                .then(artistInfos => {
                    artistslist.push(...artistInfos.filter(artist => artist !== null));
                    callback(null, artistslist);
                })
            })
        })
        .catch(error => {
            callback(error,null);
        })
    }

    // async: callback(err, [Track])
    getArtistTopTracks(artistId, marketCode, callback) {
        // Implement getArtistTopTracks using axios
        this.axiosReq(`/artists/${artistId}/top-tracks?market=${marketCode}`)
        .then(data => {
            const trackslist = data.tracks;
            callback(null, trackslist);
        })
        .catch(error => {
            callback(error,null);
        })
    }

    // async: callback(err, Playlist)
    getPlaylist(playlistId, callback) {
        // Implement getPlaylist using axios
        this.axiosReq(`/playlists/${playlistId}`)
        .then(data => {
            const playlistInfo = {
                description: data.description,
                followers: data.followers.total,
                playlistId,
                imageUrl: data.images ? data.images[0].url : null,
                name: data.name,
                popularity: data.popularity,
                owner: data.owner.id,
                public: data.public,
                tracks: null
            }

            const trackPromises = this.prom(data.tracks.items, this.getTrack.bind(this));

            Promise.all(trackPromises)
            .then((trackInfo) => {
                playlistInfo.tracks = playlistInfo.tracks ?? [];
                playlistInfo.tracks.push(...trackInfo.filter(track => track !== null));
                callback(null, playlistInfo);
            })
        })
        .catch(error => {
            callback(error, null);
        })
    }
}

module.exports = { SpotifyApi };
