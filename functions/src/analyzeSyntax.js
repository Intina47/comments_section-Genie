const {LanguageServiceClient} = require("@google-cloud/language");

const languageClient = new LanguageServiceClient();

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

module.exports = {analyzeSyntax};
