# comments_section-Genie
# YouTube Comment Analysis API

This API retrieves comments from a YouTube video and performs sentiment analysis and question detection on each comment using the Google Cloud Natural Language API.

## Setup

1. Install the required dependencies:

```bash
npm install firebase-functions @google-cloud/language axios dotenv he

```

Enable the YouTube Data API and the Google Cloud Natural Language API for your project in the Google Cloud Console.

Set your YouTube Data API key in the Firebase functions configuration:

```bash
firebase functions:config:set youtube.apikey="YOUR_API_KEY"
```

Set the ``GOOGLE_APPLICATION_CREDENTIALS`` environment variable to the path of your Google Cloud service account key file.

## Usage
Send a GET request to the ``/getVideoComments`` endpoint with the videoUrl query parameter set to the URL of the YouTube video:

```bash
GET /getVideoComments?videoUrl=https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

The API will return a JSON array of objects, where each object has the following properties:
- **comment:** The preprocessed comment text.
- **sentiment:** The sentiment analysis result, which includes a score and a magnitude.
- **isQuestion:** A boolean indicating whether the comment is a question.

## Functions
- **getComments(videoId, apiKey):** Retrieves comments for a YouTube video using the YouTube Data API.
- **extractVideoId(url):** Extracts the video ID from a YouTube URL.
- **preprocessComment(comment):** Preprocesses a comment by performing various transformations.
- **analyzeSentiment(text):** Analyzes the sentiment of the given text.
- **analyzeSyntax(text):** Analyzes the syntax of the given text and determines if it contains a question.