const axios = require("axios");
const {db} = require("./firebaseAdmin");
const {preprocessComment} = require("./preprocessComment");
const {analyzeSentiment} = require("./analyzeSentiment");
const {analyzeSyntax} = require("./analyzeSyntax");
const {analyzeTrends} = require("./analyzeTrends");

/**
 * Retrieves comments for a YouTube video using the YouTube Data API.
 * @param {string} videoId - The ID of the YouTube video.
 * @param {string} apiKey - The API key for accessing the YouTube Data API.
 * @return {Promise<Object>} - A promise that resolves to an
 * object with analysis results.
 */
async function getComments(videoId, apiKey) {
  try {
    const videoResponse = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
      params: {
        part: "snippet,statistics",
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
        videoId,
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

    const commentsData = {
      videoId,
      videoTitle,
      videoDescription: videoDescription.substring(0, 500),
      channelTitle,
      commentCount,
      numQuestions,
      positivePercentage,
      neutralPercentage,
      negativePercentage,
      trends,
      comments: response.data.items.map(
          (item) => item.snippet.topLevelComment.snippet.textDisplay,
      ),
    };

    try {
      await db.collection("comments").add(commentsData);
    } catch (error) {
      console.error("Error saving comments to Firestore: ", error);
    }

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

module.exports = {getComments};
