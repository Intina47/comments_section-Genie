const {LanguageServiceClient} = require("@google-cloud/language");

const languageClient = new LanguageServiceClient();

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

module.exports = {analyzeTrends};
