'use strict';
const express = require('express');
const { SpotifyApi } = require('./spotifyApi');
const { EntityNotFoundError, ApiError, TooManyRequestsError } = require('./error');

const app = express();
const PORT = 3000;

// Spotify Client ID
const clientId = 'your spotify client id';
// Spotify Client secret
const clientSecret = 'your spotify client secret';

function generateButtom() {
    return `<a href="/web" class="btn"><span>back to search</span></a>`;
}

function generateSearchTable(type, query, detail) {
    const type_U = type.charAt(0).toUpperCase() + type.slice(1);
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>${type_U} Search Result</title>
            <link rel="stylesheet" href="/web/style.css">
        </head>
        <body>
            <h1> ${type_U} search result: ${query}</h1>
            <table>
                ${detail}
            </table>
            ${generateButtom()}
        </body>
        </html>
    `
}

function generateErrorPage(code, err) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Spotify Search</title>
            <link rel="stylesheet" href="/web/style.css">
        </head>
        <body>
            <h1>${code}</h1>
            <section>
                <p>${err.message}</p>
            </section>
            ${generateButtom()}
        </body>
        </html>
    `;
}

function durationFormat(ms) {
    const s = Math.floor(ms / 1000);
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function dateFormat(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'});
}

(async () => {
    const accessToken = await SpotifyApi.getAccessToken(clientId, clientSecret);
    const spotifyApi = new SpotifyApi(accessToken);

    app.use('/web', express.static('public'));

    app.get('/web/search', async (req, res, next) => {
        try {
            const type = req.query.type;
            const query = req.query.query;
            if(!type || query === "") next(new ApiError('Type or Query Empty'));

            if(type === 'album') {
                spotifyApi.searchAlbums(query, (err, data) => {
                    if(err) next(err);
                    else {
                        // console.log("Full album data:", data);
                        let result = `
                            <tr>
                                <th>Album cover</th>
                                <th>Album name</th>
                                <th>Artist name</th>
                                <th>Release date</th>
                                <th>Number of tracks</th>
                            </tr>`;
                        result += data.map(d => `
                            <tr>
                                <td><img src="${d.imageUrl ? d.imageUrl : ''}" width="100"></td>
                                <td><a class="link-container" href="/web/album?id=${d.albumId}">${d.name}</a></td>
                                <td>${d.artists.map(artist => `<a class="link-container" href="/web/artist?id=${artist.id}">${artist.name}</a>`).join(', ')}</td>
                                <td>${dateFormat(d.releaseDate)}</td>
                                <td>${d.tracks.total}</td>
                            </tr>
                        `).join('');
                        
                        if(data.length === 0) {
                            result = `
                            <section>
                                <p><strong>Query not found</strong></p>
                            </section>
                            `
                        }
                        res.send(generateSearchTable(type, query, result));
                    }
                })
            }
            else if(type === 'track') {
                spotifyApi.searchTracks(query, (err, data) => {
                    if(err) next(err);
                    else {
                        let result = `
                            <tr>
                                <th>Track name</th>
                                <th>Artist name</th>
                                <th>Album name</th>
                                <th>Duration</th>
                                <th>Popularity score</th>
                                <th>Preview</th>
                            </tr>`;
                        result += data.map(d => `
                            <tr>
                                <td>${d.name}</td>
                                <td>${d.artists.map(artist => `<a class="link-container" href="/web/artist?id=${artist.id}">${artist.name}</a>`).join(', ')}</td>
                                <td><a class="link-container" href="/web/album?id=${d.albumId}">${d.albumName}</a></td>
                                <td>${durationFormat(d.durationMs)}</td>
                                <td>${d.popularity}</td>
                                <td>
                                    <iframe style="border-radius:12px" src="https://open.spotify.com/embed/track/${d.trackId}?utm_source=generator" 
                                    // width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; 
                                    // fullscreen; picture-in-picture" loading="lazy"></iframe>
                                </td>
                            </tr>
                        `).join('');
                        
                        if(data.length === 0) {
                            result = `
                            <section>
                                <p><strong>Query not found</strong></p>
                            </section>
                            `
                        }
                        res.send(generateSearchTable(type, query, result));
                    }
                })
            }
            else if(type === 'artist') {
                spotifyApi.searchArtists(query, (err, data) => {
                    if(err) next(err);
                    else {
                        let result = `
                            <tr>
                                <th>Artist image</th>
                                <th>Artist name</th>
                                <th>Genres</th>
                                <th>Popularity rating</th>
                                <th>Top tracks</th>
                            </tr>
                        `;
                        result += data.map(d => `
                            <tr>
                                <td><img src="${d.imageUrl ? d.imageUrl : ''}" width="100"></td>
                                <td>${d.name}</td>
                                <td>${d.genres}</td>
                                <td>${d.popularity}</td>
                                <td><a class="image-button" href="/web/artist?id=${d.artistId}">
                                    <img src="link_icon.png" alt="link">
                                </a></td>
                            </tr>
                        `).join('');
                        
                        if(data.length === 0) {
                            result = `
                            <section>
                                <p><strong>Query not found</strong></p>
                            </section>
                            `
                        }
                        res.send(generateSearchTable(type, query, result));
                    }
                })
            }
            else {
                next(new EntityNotFoundError('Type Not Found'));
            }
        } catch (error) {
            next(error);
        }
    });

    app.get('/web/album', async (req, res, next) => {
        const id = req.query.id;
        if(!id || id === "") next(new ApiError('ID Error'));

        spotifyApi.getAlbum(id, (err, data) => {
            if(err) next(err);
            else {
                const tracksTable = data.tracks.items.map((d, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td><a class="link-container" href="/web/track?id=${d.id}">${d.name}</a></td>
                        <td>${durationFormat(d.duration_ms)}</td>
                    </tr>
                `).join('');
                const result = `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <title>Spotify Search</title>
                        <link rel="stylesheet" href="/web/style.css">
                    </head>
                    <body>
                        <h1>${data.name}</h1>
                        <section class="detail-page">
                            <img id="artist_img" src="${data.imageUrl}" width="30%">
                            <div class="detail-content">
                                <p><strong>Album ID:</strong><br>${data.albumId}</p>
                                <p><strong>Artists:</strong><br>${data.artists.map(artist => `<a class="link-container" href="/web/artist?id=${artist.id}">${artist.name}</a>`).join(', ')}</p>
                                <p><strong>Genres:</strong><br>${data.genres ? data.genres : ""}</p>
                                <p><strong>Release Date:</strong><br>${dateFormat(data.releaseDate)}</p>
                            </div>
                        </section>
                        <table>
                            <tr>
                                <th>#</th>
                                <th>Track</th>
                                <th>Duration</th>
                            </tr>
                            ${tracksTable}
                        </table>
                        ${generateButtom()}
                    </body>
                    </html>
                `;

                res.send(result);
            }
        })
    })

    app.get('/web/track', async (req, res, next) => {
        try {
            const id = req.query.id;
            if(!id || id === "") next(new ApiError('ID Error'));

            spotifyApi.getTrack(id, (err, data) => {
                if(err) next(err);
                else {
                    const result = `
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <title>Spotify Search</title>
                            <link rel="stylesheet" href="/web/style.css">
                        </head>
                        <body>
                            <h1>${data.name}</h1>
                            <section class="detail-page">
                                <iframe style="border-radius:12px" src="https://open.spotify.com/embed/track/${data.trackId}?utm_source=generator" 
                                // width="100%" height="400" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; 
                                // fullscreen; picture-in-picture" loading="lazy"></iframe>
                                <div class="detail-content">
                                    <p><strong>Track ID:</strong><br>${data.trackId}</p>
                                    <p><strong>Artists:</strong><br>${data.artists.map(artist => `<a class="link-container" href="/web/artist?id=${artist.id}">${artist.name}</a>`).join(', ')}</p>
                                    <p><strong>Album:</strong><br><a class="link-container" href="/web/album?id=${data.albumId}">${data.albumName}</a></p>
                                    <p><strong>Popularity:</strong><br>${data.popularity}</p>
                                </div>
                            </section>
                            ${generateButtom()}
                        </body>
                        </html>
                    `;

                    res.send(result);
                }
            })
        } catch (error) {
            next(error)
        }
    })

    app.get('/web/artist', async (req, res, next) => {
        try {
            const id = req.query.id;
            if(!id || id === "") next(new ApiError('ID Error'));

            spotifyApi.getArtist(id, (err, data) => {
                if(err) next(err);
                else {
                    spotifyApi.getArtistTopTracks(id, "TW", (errTop, dataTop) => {
                        if(errTop) next(errTop);
                        else {
                            const topTracksTable = dataTop.map((dT, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td><a class="link-container" href="/web/track?id=${dT.id}">${dT.name}</a></td>
                                    <td><a class="link-container" href="/web/album?id=${dT.album.id}">${dT.album.name}</a></td>
                                    <td>${dT.popularity}</td>
                                    <td>${durationFormat(dT.duration_ms)}</td>
                                </tr>
                            `).join('');

                            const result = `
                                <!DOCTYPE html>
                                <html lang="en">
                                <head>
                                    <meta charset="UTF-8">
                                    <title>Spotify Search</title>
                                    <link rel="stylesheet" href="/web/style.css">
                                </head>
                                <body>
                                    <h1>${data.name}</h1>
                                    <section class="detail-page">
                                        <img id="artist_img" src="${data.imageUrl}" width="30%">
                                        <div class="detail-content">
                                            <p><strong>Artist ID:</strong><br>${data.artistId}</p>
                                            <p><strong>Followers:</strong><br>${data.followers.toLocaleString()}</p>
                                            <p><strong>Genres:</strong><br>${data.genres ? data.genres : ""}</p>
                                            <p><strong>Popularity:</strong><br>${data.popularity}</p>
                                        </div>
                                    </section>
                                    <table>
                                        <tr>
                                            <th>#</th>
                                            <th>Track</th>
                                            <th>Album</th>
                                            <th>Popularity</th>
                                            <th>Duration</th>
                                        </tr>
                                        ${topTracksTable}
                                    </table>
                                    ${generateButtom()}
                                </body>
                                </html>
                            `;
        
                            // res.send(generateDetailPage());
                            res.send(result);
                        }
                    })
                }
            })
        } catch (error) {
            next(error);
        }
    })

    app.get('/web/error', async (req, res, next) => {
        next(new EntityNotFoundError("Error Test"));
    })

    // Error handling middleware
    function errorHandler(err, req, res, next) {
        console.error(err);
    
        if (err instanceof EntityNotFoundError || 
            err instanceof TooManyRequestsError
        ) {
            res.status(err.statusCode);
            res.send(generateErrorPage(`${err.statusCode}`, err));
        } 
        else {
            res.status(500);
            res.send(generateErrorPage("500", err));
        }
    }

    // Add error handling middleware last
    app.use(errorHandler);
    
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
})();
