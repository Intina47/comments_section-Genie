const functions = require('firebase-functions');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function getComments(videoId, apiKey) {
    try {
        const response = await axios.get(`https://www.googleapis.com/youtube/v3/commentThreads`, {
            params: {
                part: 'snippet',
                videoId: videoId,
                key: apiKey,
                maxResults: 10,  // You can adjust this value
            }
        });

        const comments = response.data.items.map(item => item.snippet.topLevelComment.snippet.textDisplay);
        console.log(comments);
        return comments;
    } catch (error) {
        console.error(error);
        return [];
    }
}

function extractVideoId(url) {
    const videoId = url.split('v=')[1];
    return videoId;
}

exports.getVideoComments = functions.https.onRequest( async(request, response) => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const videoUrl = request.query.videoUrl;
    const videoId = extractVideoId(videoUrl);
    const comments = await getComments(videoId, apiKey);
    response.send(comments);
});

getComments(videoId, apiKey);