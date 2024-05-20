const he = require("he");

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


module.exports = {preprocessComment};
