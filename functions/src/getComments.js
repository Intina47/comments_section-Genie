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
  const maxComments = 300;
  let comments = [];
  let pageToken = "";
  let totalComments = 0;

  try {
    const videoResponse = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
      params: {
        part: "snippet,statistics",
        id: videoId,
        key: apiKey,
      },
    });

    const videoData = videoResponse.data.items[0];
    const videoTitle = videoData.snippet.title;
    const videoDescription = videoData.snippet.description;
    const channelTitle = videoData.snippet.channelTitle;
    const commentCount = videoData.statistics.commentCount;

    let numQuestions = 0;
    let positiveComments = 0;
    let neutralComments = 0;
    let negativeComments = 0;
    const trends = {};

    while (totalComments < maxComments && pageToken !== null) {
      const response = await axios.get(`https://www.googleapis.com/youtube/v3/commentThreads`, {
        params: {
          part: "snippet",
          videoId,
          key: apiKey,
          maxResults: 100,
          pageToken,
        },
      });

      const items = response.data.items;

      const commentPromises = items.map(async (item) => {
        const commentText = preprocessComment(
            item.snippet.topLevelComment.snippet.textDisplay,
        );

        if (!commentText) return null;

        try {
          const [sentiment, isQuestion, commentTrends] = await Promise.all([
            analyzeSentiment(commentText),
            analyzeSyntax(commentText),
            analyzeTrends(commentText),
          ]);

          totalComments++;
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

          const positivePercentage = ((sentiment.score + 1) / 2) * 100;

          return {
            comment: commentText,
            sentimentAnalysis: {
              positivePercentage,
            },
            isQuestion,
          };
        } catch (error) {
          console.error("Error analyzing comment:", error);
          return null;
        }
      });

      const chunkComments = (
        await Promise.all(commentPromises)
      ).filter(Boolean);
      comments = comments.concat(chunkComments);
      pageToken = response.data.nextPageToken || null;

      // Break if there are no more comments to fetch
      if (!pageToken || totalComments >= maxComments) break;
    }

    const positivePercentage = (positiveComments / totalComments) * 100 || 0;
    const neutralPercentage = (neutralComments / totalComments) * 100 || 0;
    const negativePercentage = (negativeComments / totalComments) * 100 || 0;

    const filteredTrends = Object.keys(trends)
        .filter((key) => trends[key] >= 4)
        .reduce((obj, key) => {
          obj[key] = trends[key];
          return obj;
        }, {});

    try {
      await db.collection("comments").add({videoId, comments});
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
        trends: filteredTrends,
      },
      comments,
    };
  } catch (error) {
    console.error("Error retrieving comments:", error);
    return {
      error: error.message,
    };
  }
}

module.exports = {getComments};
