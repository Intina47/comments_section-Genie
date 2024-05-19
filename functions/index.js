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
 * @return {Promise<Object>} - A promise that resolves to an
 * object with analysis results.
 */
async function getComments(videoId, apiKey) {
  try {
    // Get video details
    const videoResponse = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
      params: {
        part: "snippet, statistics",
        id: videoId,
        key: apiKey,
      },
    });

    const videoTitle = videoResponse.data.items[0].snippet.title;
    const videoDescription = videoResponse.data.items[0].snippet.description;
    const channelTitle = videoResponse.data.items[0].snippet.channelTitle;
    const commentCount = videoResponse.data.items[0].statistics.commentCount;

    const response = await axios.get(`https://www.googleapis.com/youtube/v3/commentThreads`, {
      params: {
        part: "snippet",
        videoId: videoId,
        key: apiKey,
        maxResults: 100,
      },
    });

    let numComments = 0;
    let numQuestions = 0;
    let positiveComments = 0;
    let neutralComments = 0;
    let negativeComments = 0;
    const trends = {};

    for (const item of response.data.items) {
      const commentText = preprocessComment(
          item.snippet.topLevelComment.snippet.textDisplay,
      );
      if (!commentText) continue;

      try {
        const sentiment = await analyzeSentiment(commentText);
        const isQuestion = await analyzeSyntax(commentText);
        const commentTrends = await analyzeTrends(commentText);

        numComments++;
        if (isQuestion) numQuestions++;
        if (sentiment.score > 0) {
          positiveComments++;
        } else if (sentiment.score < 0) {
          negativeComments++;
        } else {
          neutralComments++;
        }

        for (const trend of commentTrends) {
          trends[trend.name] = (trends[trend.name] || 0) + 1;
        }
      } catch (error) {
        console.error("Error analyzing comment:", error);
        continue;
      }
    }

    const positivePercentage = (positiveComments / numComments) * 100;
    const neutralPercentage = (neutralComments / numComments) * 100;
    const negativePercentage = (negativeComments / numComments) * 100;

    return {
      metadata: {
        videoTitle,
        videoDescription: videoDescription.substring(0, 500),
        channelTitle,
        commentCount,
        numQuestions,
        positivePercentage,
        neutralPercentage,
        negativePercentage,
        trends,
      },
    };
  } catch (error) {
    return {
      error: error.message,
    };
  }
}

/**
 * Extracts the video ID from a YouTube URL.
 * @param {string} url - The YouTube URL.
 * @return {string} The video ID.
 */
function extractVideoId(url) {
  const videoId = url.split("v=")[1].split("&")[0];
  return videoId;
}

exports.getVideoComments = functions.https.onRequest(
    async (request, response) => {
      const apiKey = functions.config().youtube.apikey;
      const videoUrl = request.query.videoUrl;
      const videoId = extractVideoId(videoUrl);
      const commentsAnalysis = await getComments(videoId, apiKey);
      response.send(commentsAnalysis);
    });

/**
 * Preprocesses a comment by performing various transformations.
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
 * @param {string} text - The text to analyze.
 * @return {boolean} - True if the text contains a question,
 * false otherwise.
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
 *  array of entity objects.
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
