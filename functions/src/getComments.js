const axios = require("axios");
const {preprocessComment} = require("./preprocessComment");
const {analyzeSentiment} = require("./analyzeSentiment");
const {analyzeSyntax} = require("./analyzeSyntax");
const {analyzeTrends} = require("./analyzeTrends");

const axiosInstance = axios.create({
  timeout: 60000,
});

/**
 * Retrieves comments for a YouTube video using the YouTube Data API.
 * @param {string} videoId - The ID of the YouTube video.
 * @param {string} apiKey - The API key for accessing the YouTube Data API.
 * @return {Promise<Object>} - A promise that resolves
 * to an object with analysis results.
 */
async function getComments(videoId, apiKey) {
  const maxComments = 150;
  let comments = [];
  let pageToken = "";
  let totalComments = 0;

  try {
    const videoResponse = await axiosInstance.get(`https://www.googleapis.com/youtube/v3/videos`, {
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
      const response = await axiosInstance.get(`https://www.googleapis.com/youtube/v3/commentThreads`, {
        params: {
          part: "snippet",
          videoId,
          key: apiKey,
          maxResults: Math.min(maxComments - totalComments, 100),
          pageToken,
        },
      });

      const items = response.data.items;

      const processComment = async (item) => {
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
          if (sentiment.score > 0) positiveComments++;
          else if (sentiment.score < 0) negativeComments++;
          else neutralComments++;

          for (const trend of commentTrends) {
            trends[trend.name] = (trends[trend.name] || 0) + 1;
          }

          const positivePercentage = ((sentiment.score + 1) / 2) * 100;

          return {
            comment: commentText,
            sentimentAnalysis: {positivePercentage},
            isQuestion,
          };
        } catch (error) {
          console.error("Error analyzing comment:", error);
          return null;
        }
      };

      const chunkSize = 10; // concurrency level
      const commentChunks = [];
      for (let i = 0; i < items.length; i += chunkSize) {
        commentChunks.push(items.slice(i, i + chunkSize));
      }

      for (const chunk of commentChunks) {
        const chunkComments = (
          await Promise.all(chunk.map(processComment))
        ).filter(Boolean);
        comments = comments.concat(chunkComments);
      }

      pageToken = response.data.nextPageToken || null;

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
    return {error: error.message};
  }
}

module.exports = {getComments};
