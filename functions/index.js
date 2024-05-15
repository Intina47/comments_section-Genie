const functions = require("firebase-functions");
const axios = require("axios");
const dotenv = require("dotenv");
const he = require("he");
dotenv.config();


/**
 * Retrieves comments for a YouTube video using the YouTube Data API.
 * @param {string} videoId - The ID of the YouTube video.
 * @param {string} apiKey - The API key for accessing the YouTube Data API.
 * @return {Promise<Array<string>>} - A promise that resolves
                                    * to an array of comments.
 */
async function getComments(videoId, apiKey) {
  try {
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/commentThreads`, {
      params: {
        part: "snippet",
        videoId: videoId,
        key: apiKey,
        maxResults: 10, // You can adjust this value
      },
    });

    const comments = response.data.items.map(
        (item) =>
          preprocessComment(item.snippet.topLevelComment.snippet.textDisplay));
    console.log(comments);
    return comments;
  } catch (error) {
    console.error(error);
    return [];
  }
}

/**
 * Extracts the video ID from a YouTube URL.
 *
 * @param {string} url - The YouTube URL.
 * @return {string} The video ID.
 */
function extractVideoId(url) {
  const videoId = url.split("v=")[1];
  return videoId;
}

exports.getVideoComments = functions.https.onRequest(
    async (request, response) => {
      const apiKey = functions.config().youtube.apikey;
      const videoUrl = request.query.videoUrl;
      const videoId = extractVideoId(videoUrl);
      const comments = await getComments(videoId, apiKey);
      response.send(comments);
    });

/**
 * Preprocesses a comment by performing various transformations.
 *
 * @param {string} comment - The comment to be preprocessed.
 * @return {string} The preprocessed comment.
 */
function preprocessComment(comment) {
  // HTML decode
  comment = he.decode(comment);

  // Replace URLs with 'LINK'
  comment = comment.replace(/https?:\/\/[^\s]+/g, "LINK");

  // Convert to lowercase
  comment = comment.toLowerCase();

  // Remove punctuation and special characters
  comment = comment.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");

  // Remove extra whitespace
  comment = comment.trim();

  return comment;
}
