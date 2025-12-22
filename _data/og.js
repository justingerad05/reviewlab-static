module.exports = function (content) {
  if (!content) return null;

  const match = content.match(
    /(?:youtube\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );

  if (!match) return null;

  const videoId = match[1];

  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};
