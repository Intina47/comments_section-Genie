/**
 * Extracts the video ID from a YouTube URL.
 * @param {string} url - The YouTube URL.
 * @return {string} The video ID.
 */
function extractVideoId(url) {
  const videoId = url.split("v=")[1].split("&")[0];
  return videoId;
}

module.exports = {extractVideoId};

