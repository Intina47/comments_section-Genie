const functions = require("firebase-functions");
const {extractVideoId} = require("./src/extractVideoId");
const {getComments} = require("./src/getComments");
require("dotenv").config();

exports.getVideoComments = functions.https.onRequest(
    async (request, response) => {
      const apiKey = functions.config().youtube.apikey;
      const videoUrl = request.query.videoUrl;
      const videoId = extractVideoId(videoUrl);
      const commentsAnalysis = await getComments(videoId, apiKey);
      response.send(commentsAnalysis);
    });
