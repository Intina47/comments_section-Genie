const functions = require("firebase-functions");
const client = require("@google-cloud/language");
const axios = require("axios");
const dotenv = require("dotenv");
const he = require("he");
dotenv.config();
const languageClient = new client.LanguageServiceClient();

/**
 * Retrieves comments for a YouTube video using the YouTube Data API.
 * @param {string} videoId - The ID of the YouTube video.
 * @param {string} apiKey - The API key for accessing the YouTube Data API.
 * @return {Promise<Array<string>>} - A promise that resolves
                                    * to an array of comments.
 */
async function getComments(videoId, apiKey) {
  try {
    // get video details
    const videoResponse = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
      params: {
        part: "snippet",
        id: videoId,
        key: apiKey,
      },
    });

    const videoTitle = videoResponse.data.items[0].snippet.title;
    const videoDescription = videoResponse.data.items[0].snippet.description;
    const channelTitle = videoResponse.data.items[0].snippet.channelTitle;
    let numQuestions = 0;

    const response = await axios.get(`https://www.googleapis.com/youtube/v3/commentThreads`, {
      params: {
        part: "snippet",
        videoId: videoId,
        key: apiKey,
        maxResults: 20,
      },
    });

    const comments = await Promise.all(response.data.items.map(async (item) => {
      try {
        const comment = preprocessComment(
            item.snippet.topLevelComment.snippet.textDisplay,
        );
        const sentiment = await analyzeSentiment(comment);
        const isQuestion = await analyzeSyntax(comment);
        const trends = await analyzeTrends(comment);

        if (isQuestion) {
          numQuestions++;
        }

        return {
          comment,
          sentiment,
          isQuestion,
          trends,
        };
      } catch (error) {
        console.error("Error processing comment:", error);
        return {
          error: error.message,
        };
      }
    }));

    const validComments = comments.filter((comment) => !comment.error);

    return [{
      metadata: {
        videoTitle,
        videoDescription,
        channelTitle,
        numQuestions,
      },
      comments: validComments,
    }];
  } catch (error) {
    return [{
      error: error.message,
    }];
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
  if (comment.match(/https?:\/\/\S+/)) {
    return "";
  }

  comment = he.decode(comment);
  comment = comment.toLowerCase();
  comment = comment.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");
  comment = comment.trim();

  return comment;
}

/**
 * Analyzes the sentiment of the given text.
 * @param {string} text - The text to analyze.
 * @return {object} - The sentiment analysis result.
 */
async function analyzeSentiment(text) {
  const document = {
    content: text,
    type: "PLAIN_TEXT",
  };
  const [result] = await languageClient.analyzeSentiment({document: document});
  const sentiment = result.documentSentiment;

  return sentiment;
}

/**
 * Analyzes the syntax of the given text and determines
 * if it contains a question.
 *
 * @param {string} text - The text to analyze.
 * @return {boolean} - True if the text contains a question, false otherwise.
 */
async function analyzeSyntax(text) {
  const document = {
    content: text,
    type: "PLAIN_TEXT",
  };

  const [syntax] = await languageClient.analyzeSyntax({document});
  const tokens = syntax.tokens;

  const isQuestion = tokens.some((token) => token.text.content === "?");

  return isQuestion;
}

/**
 * Analyzes trends in the given text and returns a list of entities.
 * @param {string} text - The text to analyze.
 * @return {Promise<Array<Object>>} - A promise that resolves to an
 * array of entity objects.
 */
async function analyzeTrends(text) {
  try {
    const document = {
      content: text,
      type: "PLAIN_TEXT",
    };

    const [result] = await languageClient.analyzeEntities({document});

    const entities = result.entities.map((entity) => ({
      name: entity.name,
      type: entity.type,
      salience: entity.salience,
    }));

    return entities;
  } catch (error) {
    console.error("Error analyzing trends:", error);
    return [];
  }
}

