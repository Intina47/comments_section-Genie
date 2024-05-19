const functions = require("firebase-functions");
const {SessionsClient} = require("@google-cloud/dialogflow");
const cors = require("cors")({origin: true});

const projectId = "comment-section-genie";
const location = "us-central1";
const agentId = "352918a4-14e9-45f0-9781-f339d6057bf4";

const sessionClient = new SessionsClient({
  apiEndpoint: `${location}-dialogflow.googleapis.com`,
});

exports.dialogflowGateway = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const sessionId = req.body.sessionId;
      const query = req.body.query;
      const languageCode = req.body.languageCode || "en";

      const sessionPath = sessionClient.projectLocationAgentSessionPath(
          projectId, location, agentId, sessionId,
      );
      const request = {
        session: sessionPath,
        queryInput: {
          text: {
            text: query,
            languageCode: languageCode,
          },
        },
      };

      const [response] = await sessionClient.detectIntent(request);
      const result = response.queryResult;

      res.status(200).send({
        queryText: result.queryText,
        intent: result.intent.displayName,
        fulfillmentText: result.fulfillmentText,
        confidence: result.intentDetectionConfidence,
      });
    } catch (error) {
      console.error("Dialogflow API request error:", error);
      res.status(500).send({
        error: "Internal Server Error",
        message: error.message,
        details: error.details,
      });
    }
  });
});
