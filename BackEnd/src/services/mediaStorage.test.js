const test = require('node:test');
const assert = require('node:assert/strict');
const { getCloudinaryPublicId } = require('./mediaStorage');

test('extracts image public IDs from Cloudinary URLs', () => {
  assert.equal(
    getCloudinaryPublicId(
      'https://res.cloudinary.com/demo/image/upload/v123/feelamong/posts/image-id.jpg',
      'image'
    ),
    'feelamong/posts/image-id'
  );
});

test('extracts video public IDs from Cloudinary URLs', () => {
  assert.equal(
    getCloudinaryPublicId(
      'https://res.cloudinary.com/demo/video/upload/v456/feelamong/videos/video-id.mp4',
      'video'
    ),
    'feelamong/videos/video-id'
  );
});

test('preserves the extension in raw Cloudinary public IDs', () => {
  assert.equal(
    getCloudinaryPublicId(
      'https://res.cloudinary.com/demo/raw/upload/v456/feelamong/chat/document-id.pdf',
      'raw'
    ),
    'feelamong/chat/document-id.pdf'
  );
});

test('does not treat unrelated URLs as Cloudinary assets', () => {
  assert.equal(getCloudinaryPublicId('https://example.com/image.jpg', 'image'), null);
});
