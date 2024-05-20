const {LanguageServiceClient} = require("@google-cloud/language");

const languageClient = new LanguageServiceClient();

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
  const [result] = await languageClient.analyzeSentiment({document});
  const sentiment = result.documentSentiment;

  return sentiment;
}

module.exports = {analyzeSentiment};
